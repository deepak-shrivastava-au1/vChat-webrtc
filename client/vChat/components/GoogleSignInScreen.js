import React from 'react';
import { View, Button } from 'react-native';
import { GoogleSignin } from '@react-native-community/google-signin';

const GoogleSignInScreen = () => {
  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('User Info:', userInfo);
      // Process the user info or navigate to the next screen
    } catch (error) {
      console.log('Google Sign-In Error:', error);
      // Handle the sign-in error
    }
  };

  return (
    <View>
      <Button title="Sign in with Google" onPress={signIn} />
    </View>
  );
};

export default GoogleSignInScreen;
