#import "SSLCAModule.h"
#import "SRCASecurityPolicy.h"
#import <Security/Security.h>
#import <React/RCTLog.h>
#import <React/RCTWebSocketModule.h>
#import <SocketRocket/SRWebSocket.h>

@interface SSLCAModule () <NSURLSessionDelegate>
@end

static SecCertificateRef _caCertificate = NULL;
static NSURLSession *_trustedSession = nil;
static SRCASecurityPolicy *_caSecurityPolicy = nil;

/**
 * Backstop on a single box request, for the case where nothing else stops it.
 *
 * Deliberately above every budget JS passes in — the caller's own timeout is
 * what should decide, this only catches a task that would otherwise linger.
 */
static const NSTimeInterval kResourceTimeoutSeconds = 90.0;

@implementation SSLCAModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

#pragma mark - Public

+ (NSURLSession *)trustedSession {
  return _trustedSession;
}

#pragma mark - Exported Methods

RCT_EXPORT_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  @try {
    // Load ca.der from the main bundle
    NSString *certPath = [[NSBundle mainBundle] pathForResource:@"ca" ofType:@"der"];
    if (!certPath) {
      reject(@"SSL_ERROR", @"ca.der not found in main bundle", nil);
      return;
    }

    NSData *certData = [NSData dataWithContentsOfFile:certPath];
    if (!certData) {
      reject(@"SSL_ERROR", @"Failed to read ca.der data", nil);
      return;
    }

    SecCertificateRef cert = SecCertificateCreateWithData(NULL, (__bridge CFDataRef)certData);
    if (!cert) {
      reject(@"SSL_ERROR", @"Failed to parse ca.der as a valid certificate", nil);
      return;
    }

    _caCertificate = cert;

    // Create a trusted NSURLSession with this module as its delegate.
    //
    // This session only ever talks to the box, on the LAN. Saying so is what
    // keeps the pairing flow honest: joined to the box access point the phone
    // has no internet over Wi-Fi, so iOS prefers cellular for anything it is
    // allowed to send there — the request leaves over the wrong interface and
    // dies slowly instead of failing. `waitsForConnectivity` would make the
    // same wait worse by holding the task until a usable route appears, long
    // after JS gave up on its own timeout.
    NSURLSessionConfiguration *config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
    config.allowsCellularAccess = NO;
    config.waitsForConnectivity = NO;
    // `timeoutInterval` on the request only bounds *silence* between packets, so
    // a request that keeps trickling can outlive the budget JS was promised.
    // This caps the whole thing.
    config.timeoutIntervalForResource = kResourceTimeoutSeconds;

    _trustedSession = [NSURLSession sessionWithConfiguration:config
                                                    delegate:[[SSLCAModule alloc] init]
                                               delegateQueue:nil];

    // Register a custom SRWebSocket provider so that socket.io / React Native
    // WebSocket connections also trust our CA certificate.
    _caSecurityPolicy = [[SRCASecurityPolicy alloc] initWithCACertificate:cert];
    RCTSetCustomSRWebSocketProvider(^SRWebSocket *(NSURLRequest *request) {
      return [[SRWebSocket alloc] initWithURLRequest:request securityPolicy:_caSecurityPolicy];
    });

    RCTLogInfo(@"SSLCAModule: CA trust anchor loaded + WebSocket provider registered");
    resolve(@YES);
  }
  @catch (NSException *exception) {
    reject(@"SSL_ERROR", exception.reason, nil);
  }
}

/**
 * Performs a GET through the trusted session.
 *
 * React Native's own `fetch` goes through RCTHTTPRequestHandler, whose
 * NSURLSession has no authentication delegate — it evaluates the box
 * certificate against the system trust store only and rejects it. Everything
 * needed to accept it already lives in this module, so expose it to JS.
 */
RCT_EXPORT_METHOD(get:(NSString *)urlString
                  timeout:(double)timeoutMs
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (!_trustedSession) {
    reject(@"SSL_NOT_INITIALIZED",
           @"initialize must be called before get", nil);
    return;
  }

  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    reject(@"SSL_BAD_URL", [NSString stringWithFormat:@"Invalid URL: %@", urlString], nil);
    return;
  }

  NSURLRequest *request =
      [NSURLRequest requestWithURL:url
                       cachePolicy:NSURLRequestReloadIgnoringLocalCacheData
                   timeoutInterval:timeoutMs / 1000.0];

  [self runRequest:request resolver:resolve rejecter:reject];
}

/**
 * Performs a JSON POST through the trusted session — same reason as `get`
 * above: RN's own `fetch` cannot be taught about the box CA.
 */
RCT_EXPORT_METHOD(post:(NSString *)urlString
                  body:(NSString *)jsonBody
                  timeout:(double)timeoutMs
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (!_trustedSession) {
    reject(@"SSL_NOT_INITIALIZED",
           @"initialize must be called before post", nil);
    return;
  }

  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    reject(@"SSL_BAD_URL", [NSString stringWithFormat:@"Invalid URL: %@", urlString], nil);
    return;
  }

  NSMutableURLRequest *request =
      [NSMutableURLRequest requestWithURL:url
                              cachePolicy:NSURLRequestReloadIgnoringLocalCacheData
                          timeoutInterval:timeoutMs / 1000.0];
  request.HTTPMethod = @"POST";
  [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  request.HTTPBody = [(jsonBody ?: @"{}") dataUsingEncoding:NSUTF8StringEncoding];

  [self runRequest:request resolver:resolve rejecter:reject];
}

#pragma mark - Private

- (void)runRequest:(NSURLRequest *)request
          resolver:(RCTPromiseResolveBlock)resolve
          rejecter:(RCTPromiseRejectBlock)reject
{
  NSURLSessionDataTask *task = [_trustedSession
      dataTaskWithRequest:request
        completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
          if (error) {
            // The domain and code travel to JS so a failure stays diagnosable
            // from the app itself (-1003 unknown host, -1009 offline, ...).
            reject([NSString stringWithFormat:@"%@_%ld", error.domain, (long)error.code],
                   error.localizedDescription,
                   error);
            return;
          }

          NSString *body = data
              ? [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]
              : nil;
          resolve(@{
            @"status": @([(NSHTTPURLResponse *)response statusCode]),
            @"body": body ?: @""
          });
        }];
  [task resume];
}

#pragma mark - NSURLSessionDelegate

- (void)URLSession:(NSURLSession *)session
    didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge
      completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition, NSURLCredential *))completionHandler
{
  if (![challenge.protectionSpace.authenticationMethod isEqualToString:NSURLAuthenticationMethodServerTrust]) {
    completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, nil);
    return;
  }

  SecTrustRef serverTrust = challenge.protectionSpace.serverTrust;
  if (!serverTrust || !_caCertificate) {
    completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, nil);
    return;
  }

  // Set our CA as the sole trust anchor — any server certificate signed
  // by this CA will be accepted, regardless of hostname.
  CFArrayRef anchors = CFArrayCreate(NULL, (const void **)&_caCertificate, 1, &kCFTypeArrayCallBacks);
  OSStatus status = SecTrustSetAnchorCertificates(serverTrust, anchors);
  if (status != errSecSuccess) {
    CFRelease(anchors);
    completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, nil);
    return;
  }

  // Trust both our custom CA and the system root CAs (needed for Cloudflare)
  SecTrustSetAnchorCertificatesOnly(serverTrust, false);

  CFErrorRef error = NULL;
  bool trusted = SecTrustEvaluateWithError(serverTrust, &error);
  CFRelease(anchors);

  if (trusted) {
    NSURLCredential *credential = [NSURLCredential credentialForTrust:serverTrust];
    completionHandler(NSURLSessionAuthChallengeUseCredential, credential);
  } else {
    if (error) {
      RCTLogWarn(@"SSLCAModule: Certificate validation failed: %@",
                 (__bridge NSError *)error);
      CFRelease(error);
    }
    completionHandler(NSURLSessionAuthChallengeCancelAuthenticationChallenge, nil);
  }
}

@end
