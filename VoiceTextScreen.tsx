/**
 * Textarea + tombol mic untuk voice-to-text.
 */

import { useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Voice, {
  SpeechErrorEvent,
  SpeechResultsEvent,
} from '@react-native-voice/voice';

async function ensureMicPermission() {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export default function VoiceTextScreen() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const baseTextRef = useRef(''); // text already committed before the current recording session

  useEffect(() => {
    const applyLive = (e: SpeechResultsEvent) => {
      const value = e.value?.[0];
      if (!value) return;
      const base = baseTextRef.current;
      setText(base ? `${base} ${value}` : value);
    };
    Voice.onSpeechPartialResults = applyLive;
    Voice.onSpeechResults = applyLive;
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.warn('Speech error:', e.error);
      setListening(false);
    };
    Voice.onSpeechEnd = () => setListening(false);

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const toggleListening = async () => {
    if (listening) {
      await Voice.stop();
      setListening(false);
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) return;
    baseTextRef.current = text;
    // ponytail: locale hardcoded, add a picker if multi-language is needed
    await Voice.start('id-ID', { EXTRA_PARTIAL_RESULTS: true });
    setListening(true);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textarea}
        multiline
        placeholder="Ketik atau rekam suara..."
        value={text}
        onChangeText={setText}
      />
      <Pressable
        style={[styles.micButton, listening && styles.micButtonActive]}
        onPress={toggleListening}>
        <Text style={styles.micButtonText}>
          {listening ? '⏹ Stop' : '🎤 Rekam'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  textarea: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#fff',
  },
  micButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  micButtonActive: {
    backgroundColor: '#dc2626',
  },
  micButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
