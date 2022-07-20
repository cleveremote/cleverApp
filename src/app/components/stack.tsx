/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {
  Flex,
  CheckIcon,
  Divider,
  Text,
  ScrollView,
  VStack,
  Center,
  NativeBaseProvider,
  Switch,
  IconButton,
  Box,
  View,
  Heading,
  Button,
  Progress,
} from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import IO from 'socket.io-client';
import Icon from 'react-native-vector-icons/FontAwesome5';

const options = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: true,
};

export function testcoMPOSANT() {
  return (
    <NativeBaseProvider>
      <Center flex={1}>
        <ScrollView alignSelf="stretch" _contentContainerStyle={{px: '3'}}>
          <VStack space={3} alignItems="center" alignSelf="stretch">
            <Center
              alignSelf="stretch"
              h="20"
              bg="indigo.500"
              rounded="md"
              shadow={5}
            />
            <Box alignSelf="stretch" bg="#ededed" rounded="md" shadow={5}>
              <View style={{flexDirection: 'row'}} mt="3" mb="3">
                <Box style={{flex: 1, alignItems: 'flex-start'}} px="1">
                  <Flex direction="row">
                    <IconButton
                      size={21}
                      onPress={() => {
                        ReactNativeHapticFeedback.trigger(
                          'impactMedium',
                          options,
                        );
                        console.log('open execution settings');
                      }}
                      icon={<Icon name="bolt" size={21} color="#0a90b2" />}
                    />
                  </Flex>
                </Box>

                <Box style={{flex: 5, alignItems: 'center'}}>
                  <Heading
                    size="sm"
                    alignSelf="center"
                    color="grey"
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    Irrigitation ferme
                    <Switch defaultIsChecked color="#0a90b2" size={'sm'} />
                  </Heading>
                </Box>

                <Box style={{alignItems: 'flex-end'}} px="1">
                  <IconButton
                    size={22}
                    onPress={() => {
                      ReactNativeHapticFeedback.trigger(
                        'impactMedium',
                        options,
                      );
                      console.log('open settings');
                    }}
                    icon={<Icon name="cog" size={22} color="#0a90b2" />}
                  />
                </Box>
              </View>

              <Center alignSelf="stretch" mb="3" >
                {/* display={'none'} */}
                <View style={{flexDirection: 'row'}}>
                  <Heading
                    size="xs"
                    alignSelf="center"
                    color="grey"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    ml="2">
                    01:12:45
                  </Heading>
                  <Box style={{flex: 9, alignItems: 'center'}} mt={1}>
                    <Flex direction="row" px="2">
                      <Box style={{flex: 5}}>
                        <Progress
                          size="md"
                          rounded="md"
                          value={10}
                          mx="1"
                          _filledTrack={{bg: '#0a90b2'}}
                        />
                      </Box>
                    </Flex>
                  </Box>

                  <Box style={{flex: 1, alignItems: 'flex-end'}}>
                    <Flex direction="row" px="1">
                      <IconButton
                        size={21}
                        onPress={() => {
                          ReactNativeHapticFeedback.trigger(
                            'impactMedium',
                            options,
                          );
                          console.log('get information');
                        }}
                        icon={
                          <Icon name="info-circle" size={21} color="#0a90b2" />
                        }
                      />
                    </Flex>
                  </Box>
                </View>
              </Center>
            </Box>
            <Center
              alignSelf="stretch"
              h="20"
              bg="indigo.500"
              rounded="md"
              shadow={5}>
              <Box alignItems="center">
                <Button
                  onPress={() => {
                    const socket = IO('http://192.168.1.15:5001', {
                      forceNew: true,
                    });
                    socket.on('connection', () => console.log('Connection'));
                    ReactNativeHapticFeedback.trigger('impactLight', options);
                  }}>
                  Click Me
                </Button>
              </Box>
            </Center>
          </VStack>
        </ScrollView>
      </Center>
    </NativeBaseProvider>
  );
}
