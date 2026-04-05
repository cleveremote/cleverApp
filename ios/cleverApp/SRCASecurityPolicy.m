#import "SRCASecurityPolicy.h"

NS_ASSUME_NONNULL_BEGIN

@interface SRCASecurityPolicy ()
@property (nonatomic, assign) SecCertificateRef caCertificate;
@end

@implementation SRCASecurityPolicy

- (instancetype)initWithCACertificate:(SecCertificateRef)caCertificate
{
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated"
  // Disable built-in chain validation (our CA is not in the system store).
  // We validate manually in evaluateServerTrust:forDomain: below.
  self = [super initWithCertificateChainValidationEnabled:NO];
#pragma clang diagnostic pop

  if (self) {
    _caCertificate = (SecCertificateRef)CFRetain(caCertificate);
  }
  return self;
}

- (void)dealloc
{
  if (_caCertificate) {
    CFRelease(_caCertificate);
  }
}

- (BOOL)evaluateServerTrust:(SecTrustRef)serverTrust forDomain:(NSString *)domain
{
  if (!serverTrust || !_caCertificate) {
    return NO;
  }

  // Set our CA as the sole trust anchor
  CFArrayRef anchors = CFArrayCreate(NULL, (const void **)&_caCertificate, 1, &kCFTypeArrayCallBacks);
  OSStatus status = SecTrustSetAnchorCertificates(serverTrust, anchors);
  if (status != errSecSuccess) {
    CFRelease(anchors);
    return NO;
  }

  // Trust both our custom CA and the system root CAs (needed for Cloudflare)
  SecTrustSetAnchorCertificatesOnly(serverTrust, false);

  CFErrorRef error = NULL;
  bool trusted = SecTrustEvaluateWithError(serverTrust, &error);
  CFRelease(anchors);

  if (!trusted && error) {
    CFRelease(error);
  }

  return trusted;
}

@end

NS_ASSUME_NONNULL_END
