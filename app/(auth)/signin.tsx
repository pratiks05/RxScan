// app/(auth)/signin.tsx
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';
import Fontisto from '@expo/vector-icons/Fontisto';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Button } from '@/components/ui/button';
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxIcon,
} from "@/components/ui/checkbox"
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const SignIn = () => {
  const router = useRouter();
  const { signIn, isLoading, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const success = await signIn(email.trim(), password);
    
    if (success) {
      // Navigation will be handled by the auth state change in index.tsx
      router.replace('/(onboarding)');
    } else {
      Alert.alert('Sign In Failed', error || 'Invalid email or password');
    }
  };

  return (
    <View className='flex-1'>
      {/* Page Heading */}
      <Text className='text-5xl leading-[50px] font-bold pl-8 translate-y-[-10%] mb-6'>
        Sign In
      </Text>

      {/* Form Content */}
      <View className='px-8 gap-6'>
        <View className='flex flex-row items-center gap-4 border-b border-primary-500 py-2 px-2'>
          <Fontisto name="email" size={24} color={"gray"} />
          <TextInput 
            keyboardType='email-address' 
            className='flex-1 text-lg p-0 m-0' 
            placeholder='Email'
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View className='flex flex-row items-center gap-4 border-b border-primary-500 py-2 px-2'>
          <Ionicons name="lock-closed-outline" size={24} color="gray" />
          <TextInput 
            className='flex-1 text-lg p-0 m-0' 
            placeholder='Password'
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <View className='flex flex-row items-center justify-between mt-[-5px]'>
          <Checkbox value='something' size="sm" isInvalid={false} isDisabled={false} className='ml-2'>
            <CheckboxIndicator>
              <CheckboxIcon />
            </CheckboxIndicator>
            <CheckboxLabel>Remember me</CheckboxLabel>
          </Checkbox>
          <Link href={'/(auth)/forgot-password'} asChild className='ml-auto'>
            <Pressable className='mt-2'>
              <Text className='text-primary-500 text-sm'>Forgot Password?</Text>
            </Pressable>
          </Link>
        </View>
        <Button 
          size='xl' 
          className='h-[50px]' 
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className='text-lg text-primary-foreground'>Sign In</Text>
          )}
        </Button>
        <View className='flex flex-row items-center gap-1 w-fit m-auto mt-[-10px]'>
          <Text>Don&apos;t have an account?</Text>
          <Text
            className='font-bold text-primary-500'
            onPress={() => router.push('/(auth)/signup')}
          >
            Sign Up
          </Text>
        </View>
      </View>
    </View>
  )
}

export default SignIn