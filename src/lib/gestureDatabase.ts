import { GestureDefinition } from '@/types/gesture';

// Complete ASL Alphabet (A-Z)
export const ASL_ALPHABET: GestureDefinition[] = [
  { name: 'asl_a', englishText: 'A', hindiText: 'अ', emoji: '🅰️', description: 'Fist with thumb beside index finger' },
  { name: 'asl_b', englishText: 'B', hindiText: 'ब', emoji: '🅱️', description: 'Flat hand, fingers up, thumb tucked' },
  { name: 'asl_c', englishText: 'C', hindiText: 'क', emoji: '©️', description: 'Curved hand forming C shape' },
  { name: 'asl_d', englishText: 'D', hindiText: 'ड', emoji: 'D', description: 'Index up, other fingers touch thumb' },
  { name: 'asl_e', englishText: 'E', hindiText: 'इ', emoji: 'E', description: 'Fingertips touch thumb, palm out' },
  { name: 'asl_f', englishText: 'F', hindiText: 'फ', emoji: 'F', description: 'OK sign with three fingers up' },
  { name: 'asl_g', englishText: 'G', hindiText: 'ग', emoji: 'G', description: 'Index and thumb parallel, pointing' },
  { name: 'asl_h', englishText: 'H', hindiText: 'ह', emoji: 'H', description: 'Index and middle parallel, horizontal' },
  { name: 'asl_i', englishText: 'I', hindiText: 'आई', emoji: 'I', description: 'Pinky up, other fingers in fist' },
  { name: 'asl_j', englishText: 'J', hindiText: 'जे', emoji: 'J', description: 'Pinky up, trace J shape' },
  { name: 'asl_k', englishText: 'K', hindiText: 'के', emoji: 'K', description: 'Index and middle up in V, thumb between' },
  { name: 'asl_l', englishText: 'L', hindiText: 'एल', emoji: 'L', description: 'L shape with thumb and index' },
  { name: 'asl_m', englishText: 'M', hindiText: 'एम', emoji: 'M', description: 'Three fingers over thumb in fist' },
  { name: 'asl_n', englishText: 'N', hindiText: 'एन', emoji: 'N', description: 'Two fingers over thumb in fist' },
  { name: 'asl_o', englishText: 'O', hindiText: 'ओ', emoji: '⭕', description: 'All fingers touch thumb, forming O' },
  { name: 'asl_p', englishText: 'P', hindiText: 'पी', emoji: 'P', description: 'K handshape pointing down' },
  { name: 'asl_q', englishText: 'Q', hindiText: 'क्यू', emoji: 'Q', description: 'G handshape pointing down' },
  { name: 'asl_r', englishText: 'R', hindiText: 'आर', emoji: 'R', description: 'Index and middle crossed' },
  { name: 'asl_s', englishText: 'S', hindiText: 'एस', emoji: 'S', description: 'Fist with thumb over fingers' },
  { name: 'asl_t', englishText: 'T', hindiText: 'टी', emoji: 'T', description: 'Thumb between index and middle in fist' },
  { name: 'asl_u', englishText: 'U', hindiText: 'यू', emoji: 'U', description: 'Index and middle together, pointing up' },
  { name: 'asl_v', englishText: 'V', hindiText: 'वी', emoji: '✌️', description: 'Index and middle spread apart' },
  { name: 'asl_w', englishText: 'W', hindiText: 'डब्ल्यू', emoji: 'W', description: 'Index, middle, ring spread apart' },
  { name: 'asl_x', englishText: 'X', hindiText: 'एक्स', emoji: 'X', description: 'Index bent like hook' },
  { name: 'asl_y', englishText: 'Y', hindiText: 'वाई', emoji: '🤙', description: 'Thumb and pinky extended' },
  { name: 'asl_z', englishText: 'Z', hindiText: 'ज़ेड', emoji: 'Z', description: 'Index traces Z shape in air' },
];

// ASL Numbers (0-9)
export const ASL_NUMBERS: GestureDefinition[] = [
  { name: 'asl_0', englishText: 'Zero', hindiText: 'शून्य', emoji: '0️⃣', description: 'O shape - all fingers touch thumb' },
  { name: 'asl_1', englishText: 'One', hindiText: 'एक', emoji: '1️⃣', description: 'Index finger up' },
  { name: 'asl_2', englishText: 'Two', hindiText: 'दो', emoji: '2️⃣', description: 'Index and middle up, spread' },
  { name: 'asl_3', englishText: 'Three', hindiText: 'तीन', emoji: '3️⃣', description: 'Thumb, index, middle extended' },
  { name: 'asl_4', englishText: 'Four', hindiText: 'चार', emoji: '4️⃣', description: 'Four fingers up, thumb in' },
  { name: 'asl_5', englishText: 'Five', hindiText: 'पाँच', emoji: '5️⃣', description: 'All five fingers spread' },
  { name: 'asl_6', englishText: 'Six', hindiText: 'छह', emoji: '6️⃣', description: 'Pinky touches thumb, others up' },
  { name: 'asl_7', englishText: 'Seven', hindiText: 'सात', emoji: '7️⃣', description: 'Ring finger touches thumb, others up' },
  { name: 'asl_8', englishText: 'Eight', hindiText: 'आठ', emoji: '8️⃣', description: 'Middle finger touches thumb, others up' },
  { name: 'asl_9', englishText: 'Nine', hindiText: 'नौ', emoji: '9️⃣', description: 'Index touches thumb, others up' },
];

// Common Single-Hand Gestures
export const COMMON_GESTURES: GestureDefinition[] = [
  { name: 'hello', englishText: 'Hello', hindiText: 'नमस्ते', emoji: '👋', description: 'Open palm waving' },
  { name: 'stop', englishText: 'Stop', hindiText: 'रुको', emoji: '✋', description: 'Open palm facing forward' },
  { name: 'yes', englishText: 'Yes', hindiText: 'हाँ', emoji: '👍', description: 'Thumbs up gesture' },
  { name: 'no', englishText: 'No', hindiText: 'नहीं', emoji: '👎', description: 'Thumbs down gesture' },
  { name: 'thumbs_up', englishText: 'Good', hindiText: 'अच्छा', emoji: '👍', description: 'Thumbs up' },
  { name: 'thumbs_down', englishText: 'Bad', hindiText: 'बुरा', emoji: '👎', description: 'Thumbs down' },
  { name: 'open_palm', englishText: 'Open Palm', hindiText: 'खुली हथेली', emoji: '✋', description: 'All fingers extended' },
  { name: 'closed_fist', englishText: 'Fist', hindiText: 'मुट्ठी', emoji: '✊', description: 'All fingers closed' },
  { name: 'ok', englishText: 'OK', hindiText: 'ठीक है', emoji: '👌', description: 'Thumb and index forming circle' },
  { name: 'call', englishText: 'Call Me', hindiText: 'मुझे फोन करो', emoji: '🤙', description: 'Thumb and pinky extended' },
  { name: 'rock', englishText: 'Rock On', hindiText: 'रॉक ऑन', emoji: '🤘', description: 'Index and pinky extended' },
  { name: 'point', englishText: 'Point', hindiText: 'इशारा', emoji: '👆', description: 'Index finger pointing' },
  { name: 'victory', englishText: 'Victory/Peace', hindiText: 'जीत/शांति', emoji: '✌️', description: 'Peace sign - two fingers up' },
  { name: 'i_love_you', englishText: 'I Love You', hindiText: 'मैं तुमसे प्यार करता हूँ', emoji: '🤟', description: 'Thumb, index and pinky extended' },
];

// Two-Hand Gestures (require both hands)
export const TWO_HAND_GESTURES: GestureDefinition[] = [
  { name: 'thank_you', englishText: 'Thank You', hindiText: 'धन्यवाद', emoji: '🙏', description: 'Both palms together (namaste)' },
  { name: 'please', englishText: 'Please', hindiText: 'कृपया', emoji: '🙏', description: 'Flat hand on chest, circular motion' },
  { name: 'more', englishText: 'More', hindiText: 'और', emoji: '➕', description: 'Both hands pinched together tapping' },
  { name: 'help', englishText: 'Help', hindiText: 'मदद', emoji: '🆘', description: 'Fist on open palm, lift up' },
  { name: 'finish', englishText: 'Finish/Done', hindiText: 'समाप्त', emoji: '✅', description: 'Both hands open, twist outward' },
  { name: 'again', englishText: 'Again', hindiText: 'फिर से', emoji: '🔄', description: 'Bent hand flips onto open palm' },
  { name: 'sorry', englishText: 'Sorry', hindiText: 'माफ़ करें', emoji: '😔', description: 'Fist circles on chest' },
  { name: 'want', englishText: 'Want', hindiText: 'चाहिए', emoji: '👐', description: 'Both hands pull toward body' },
  { name: 'dont_want', englishText: "Don't Want", hindiText: 'नहीं चाहिए', emoji: '🙅', description: 'Hands push away from body' },
];

// Common ASL Words and Phrases
export const ASL_WORDS: GestureDefinition[] = [
  { name: 'eat', englishText: 'Eat/Food', hindiText: 'खाना', emoji: '🍽️', description: 'Fingertips to mouth' },
  { name: 'drink', englishText: 'Drink', hindiText: 'पीना', emoji: '🥤', description: 'C-hand tipping to mouth' },
  { name: 'water', englishText: 'Water', hindiText: 'पानी', emoji: '💧', description: 'W hand taps chin' },
  { name: 'bathroom', englishText: 'Bathroom', hindiText: 'बाथरूम', emoji: '🚻', description: 'T hand shakes' },
  { name: 'pain', englishText: 'Pain/Hurt', hindiText: 'दर्द', emoji: '😣', description: 'Index fingers point toward each other' },
  { name: 'medicine', englishText: 'Medicine', hindiText: 'दवाई', emoji: '💊', description: 'Middle finger circles on palm' },
  { name: 'tired', englishText: 'Tired', hindiText: 'थका हुआ', emoji: '😴', description: 'Bent hands drop on chest' },
  { name: 'happy', englishText: 'Happy', hindiText: 'खुश', emoji: '😊', description: 'Flat hands brush up on chest' },
  { name: 'sad', englishText: 'Sad', hindiText: 'उदास', emoji: '😢', description: 'Hands drop down face' },
  { name: 'understand', englishText: 'Understand', hindiText: 'समझना', emoji: '💡', description: 'Flick index finger up near forehead' },
  { name: 'dont_understand', englishText: "Don't Understand", hindiText: 'नहीं समझा', emoji: '❓', description: 'Index flicks down from forehead' },
  { name: 'good', englishText: 'Good', hindiText: 'अच्छा', emoji: '👍', description: 'Flat hand from chin forward' },
  { name: 'bad', englishText: 'Bad', hindiText: 'बुरा', emoji: '👎', description: 'Flat hand from chin, flip down' },
  { name: 'like', englishText: 'Like', hindiText: 'पसंद', emoji: '❤️', description: 'Middle finger pulls from chest' },
  { name: 'dont_like', englishText: "Don't Like", hindiText: 'पसंद नहीं', emoji: '💔', description: 'Middle finger flicks away from chest' },
  { name: 'where', englishText: 'Where', hindiText: 'कहाँ', emoji: '📍', description: 'Index finger waves side to side' },
  { name: 'what', englishText: 'What', hindiText: 'क्या', emoji: '❔', description: 'Index fingers wave down' },
  { name: 'who', englishText: 'Who', hindiText: 'कौन', emoji: '🤔', description: 'Index circles around lips' },
  { name: 'when', englishText: 'When', hindiText: 'कब', emoji: '⏰', description: 'Index circles around index' },
  { name: 'why', englishText: 'Why', hindiText: 'क्यों', emoji: '❓', description: 'Touch forehead, pull away into Y' },
  { name: 'how', englishText: 'How', hindiText: 'कैसे', emoji: '🤷', description: 'Bent hands flip palms up' },
];

// Quick phrases for communication
export const QUICK_PHRASES = [
  { text: 'Help', hindi: 'मदद', emoji: '🆘' },
  { text: 'Water please', hindi: 'पानी चाहिए', emoji: '💧' },
  { text: 'Call someone', hindi: 'किसी को बुलाओ', emoji: '📞' },
  { text: 'I need assistance', hindi: 'मुझे सहायता चाहिए', emoji: '🙋' },
  { text: 'Bathroom', hindi: 'बाथरूम', emoji: '🚻' },
  { text: 'Food', hindi: 'खाना', emoji: '🍽️' },
  { text: 'Medicine', hindi: 'दवाई', emoji: '💊' },
  { text: 'Pain', hindi: 'दर्द', emoji: '😣' },
  { text: 'Thank you', hindi: 'धन्यवाद', emoji: '🙏' },
  { text: 'Yes', hindi: 'हाँ', emoji: '✅' },
  { text: 'No', hindi: 'नहीं', emoji: '❌' },
  { text: 'I understand', hindi: 'मैं समझता हूँ', emoji: '👍' },
  { text: 'I don\'t understand', hindi: 'मैं नहीं समझा', emoji: '❓' },
  { text: 'Please repeat', hindi: 'कृपया दोहराएं', emoji: '🔄' },
  { text: 'Slowly please', hindi: 'धीरे बोलिए', emoji: '🐢' },
];

// All gestures combined for lookup
export const ALL_GESTURES: GestureDefinition[] = [
  ...COMMON_GESTURES,
  ...ASL_ALPHABET,
  ...ASL_NUMBERS,
  ...TWO_HAND_GESTURES,
  ...ASL_WORDS,
];

// Create a map for fast gesture lookup by name
export const GESTURE_MAP = new Map<string, GestureDefinition>(
  ALL_GESTURES.map(g => [g.name, g])
);

// Get gesture by name
export function getGestureByName(name: string): GestureDefinition | undefined {
  return GESTURE_MAP.get(name);
}
