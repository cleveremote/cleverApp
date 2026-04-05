#import <SocketRocket/SRSecurityPolicy.h>
#import <Security/Security.h>

NS_ASSUME_NONNULL_BEGIN

@interface SRCASecurityPolicy : SRSecurityPolicy

- (instancetype)initWithCACertificate:(SecCertificateRef)caCertificate;

@end

NS_ASSUME_NONNULL_END
