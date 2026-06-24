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

    // Create a trusted NSURLSession with this module as its delegate
    NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
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
