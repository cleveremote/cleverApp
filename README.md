# cleverApp
pour demarer le projet en debug
lancer le server : npm run start
lancer le debugger : dans vscode


pour adroid lors du lancement executer les variable d'environment 
export ANDROID_HOME=/Users/nya/Library/Android/sdk
export PATH=$ANDROID_HOME/tools:$PATH
export PATH=$ANDROID_HOME/platform-tools:$PATH

rajouter cette ligne 
/Users/nya-perso/cleveremote/cleverApp/ios/Pods/Flipper/xplat/Flipper/FlipperTransportTypes.h
#include <functional>


npm run start
select i => ios
select d => open Dev Menu
start debugger
Attach to the React Native iOS - Experimental


export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools

pour faire fonctionner le debugger depuis vscode 
sudo ln -sf /Users/nya/.nvm/versions/node/v20.20.2/bin/node /usr/local/bin/node
sudo ln -sf /Users/nya/.nvm/versions/node/v20.20.2/bin/npm /usr/local/bin/npm

rm -rf node_modules
rm -rf package-lock.json
npm install

lsof -ti :8081 | xargs kill -9 2>/dev/null && echo "killed" || echo "nothing on 8081"

cd ios                                                              
rm -rf Pods
rm -rf build
pod install --repo-update
cd ..



{"type":"cleverbox","ssid":"cleveremote-setup","password":"Nya0113?","security":"WPA2","host":"ZJzzA6Di","port":443,"deviceId":"ZJzzA6Di"}



{"type":"cleverbox","ssid":"cleveremote-setup","password":"Nya0113?","security":"WPA2","host":"zc080obf","port":443,"deviceId":"zc080obf"}

Même contenu sous forme de lien, lisible par l'appareil photo du téléphone (ouvre l'application sur la configuration de la box) :

cleverapp://box?ssid=cleveremote-setup&password=Nya0113%3F&security=WPA2&host=zc080obf&port=443&deviceId=zc080obf