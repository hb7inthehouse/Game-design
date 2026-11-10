export interface EndingInfo {
  id: string;
  name: string;
  text: string;
  hint: string;
  tone: 'good' | 'bad' | 'odd';
}

export const ENDINGS: EndingInfo[] = [
  {
    id: 'true', name: 'Let Them Off', tone: 'good',
    text: 'Everyone got home. Walter signed off. The car stopped, the way it had wanted to since 1979.',
    hint: 'Walter wrote the rules down for a reason.',
  },
  {
    id: 'morning', name: 'Morning Shift', tone: 'odd',
    text: 'You made it to six o\'clock. The car is still waiting for you. So are they.',
    hint: 'Keep your hands off thirteen and press L when it counts.',
  },
  {
    id: 'between', name: 'Between Floors', tone: 'odd',
    text: 'You stopped her before she was empty. Somebody is still waiting for a car that never comes.',
    hint: 'A key turned while someone was still aboard. Or still below.',
  },
  {
    id: 'thirteen', name: 'Thirteen', tone: 'bad',
    text: 'It was always below. You were always going down.',
    hint: 'Some buttons should not be pressed at the end.',
  },
  {
    id: 'loop', name: "The Elevator Doesn't Stop", tone: 'bad',
    text: 'You let her choose too many times. 23:00. "So you\'re the new night man."',
    hint: 'Let the car have its way.',
  },
  {
    id: 'replacement', name: 'Replacement', tone: 'bad',
    text: 'Someone else signs out with your name. "Good evening, Walter dear."',
    hint: "Rule six: don't let anyone in who is already in.",
  },
];
