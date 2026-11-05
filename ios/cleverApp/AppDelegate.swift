import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // La fabrique est créée une seule fois pour l'app ; la fenêtre, elle, est
  // créée par la scène (`SceneDelegate`), obligatoire depuis les derniers SDK.
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Certaines libs lisent encore `UIApplication.shared.delegate.window`.
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "cleverApp",
      in: window,
      launchOptions: nil
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  // @react-native-community/blur 4.4.1 ne déclare pas `ios.componentProvider`
  // dans son codegenConfig : la codegen ne l'enregistre donc pas et Fabric
  // affiche « Unimplemented component <BlurView> ». On ajoute ses vues ici.
  //
  // RCTComponentViewProtocol n'est que forward-déclaré côté Swift (son header
  // est dans React-Fabric, en Obj-C++), donc Swift masque la méthode ObjC.
  // On réimplémente le sélecteur via le runtime ObjC (pas de `override`) et on
  // récupère les composants du dependencyProvider par KVC, comme le fait
  // l'implémentation par défaut.
  //
  // Le dictionnaire reste un NSDictionary : le convertir en
  // `[String: AnyClass]` fait planter le runtime Swift (EXC_BAD_ACCESS dans
  // swift_getAssociatedTypeWitnessSlow) sur les classes du dependencyProvider.
  @objc func thirdPartyFabricComponents() -> NSDictionary {
    let provided =
      (dependencyProvider as? NSObject)?.value(forKey: "thirdPartyFabricComponents")
        as? NSDictionary
    let components = (provided?.mutableCopy() as? NSMutableDictionary) ?? NSMutableDictionary()
    guard let viewProtocol = NSProtocolFromString("RCTComponentViewProtocol") else {
      return components
    }
    for name in ["BlurView", "VibrancyView"] {
      if let cls = NSClassFromString(name) as? NSObject.Type, cls.conforms(to: viewProtocol) {
        components.setObject(cls, forKey: name as NSString)
      }
    }
    return components
  }
}
