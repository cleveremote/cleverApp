#import <React/RCTBridgeModule.h>

@interface SSLCAModule : NSObject <RCTBridgeModule>

/// Returns a pre-configured NSURLSession that validates server certificates
/// against the bundled CA (ca.der) as the sole trust anchor.
+ (NSURLSession *)trustedSession;

@end
