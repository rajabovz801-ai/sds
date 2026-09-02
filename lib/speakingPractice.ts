export type SpeakingQuestionKind = 'preference' | 'frequency' | 'experience' | 'reason';

export type SpeakingQuestion = {
  text: string;
  kind: SpeakingQuestionKind;
};

export type SpeakingTopic = {
  id: string;
  title: string;
  language: string[];
  questions: SpeakingQuestion[];
};

export type SpeakingDay = {
  day: number;
  title: string;
  subtitle: string;
  topics: SpeakingTopic[];
};

export const QUESTION_STARTERS: Record<SpeakingQuestionKind, string[]> = {
  preference: [
    'Personally, I tend to prefer ... because ...',
    'If I had to choose, I would probably ...',
    'What I like most about it is ...',
    'I am quite keen on ... / I am not really into ...',
  ],
  frequency: [
    'I usually ... once/twice a ...',
    'It depends on my schedule, but generally ...',
    'I do it fairly regularly, especially when ...',
    'Not very often, to be honest, because ...',
  ],
  experience: [
    'I remember that ...',
    'The last time I ... was when ...',
    'I have had quite a few chances to ...',
    'I have not really experienced that, but ...',
  ],
  reason: [
    'The main reason is that ...',
    'I think it is mainly because ...',
    'One thing that makes a difference is ...',
    'From my point of view, ... plays a big role.',
  ],
};

const q = (text: string, kind: SpeakingQuestionKind): SpeakingQuestion => ({ text, kind });
const t = (id: string, title: string, language: string[], questions: SpeakingQuestion[]): SpeakingTopic => ({ id, title, language, questions });

export const SPEAKING_DAYS: SpeakingDay[] = [
  {
    day: 1,
    title: 'People & Places',
    subtitle: 'Home, hometown, people around you and everyday environment.',
    topics: [
      t('home', 'Home & Accommodation', ['a spacious room', 'a quiet residential area', 'feel comfortable at home'], [q('Do you live in a house or an apartment?', 'experience'), q('What is your favourite room in your home?', 'preference'), q('What would you like to change about your home?', 'preference'), q('Do you think you will live there for a long time?', 'reason')]),
      t('hometown', 'Hometown', ['a historic city', 'a lively city centre', 'a strong sense of community'], [q('Where is your hometown?', 'experience'), q('What do you like most about your hometown?', 'preference'), q('Has your hometown changed much in recent years?', 'experience'), q('Would you like to live there in the future?', 'reason')]),
      t('work-study', 'Work or Study', ['my main area of study', 'a demanding schedule', 'gain practical experience'], [q('Do you work or are you a student?', 'experience'), q('What do you enjoy most about your work or studies?', 'preference'), q('What is the most difficult part of it?', 'experience'), q('Would you like to change your field in the future?', 'reason')]),
      t('teachers', 'Teachers', ['a supportive teacher', 'explain things clearly', 'make lessons engaging'], [q('Would you like to be a teacher?', 'preference'), q('Do you think you could be a good teacher?', 'reason'), q('Did you have a favourite teacher at school?', 'experience'), q('What qualities make a good teacher?', 'reason')]),
      t('friends', 'Friends', ['a close friend', 'have a lot in common', 'keep in touch regularly'], [q('Do you have many close friends?', 'experience'), q('How often do you meet your friends?', 'frequency'), q('What do you usually do together?', 'frequency'), q('What do you value most in a friend?', 'reason')]),
      t('family', 'Family', ['a close-knit family', 'spend quality time together', 'support each other'], [q('Do you have a large family?', 'experience'), q('Who are you closest to in your family?', 'preference'), q('How often do you spend time together?', 'frequency'), q('Why is family important to you?', 'reason')]),
      t('daily-routine', 'Daily Routine', ['follow a regular routine', 'start the day early', 'manage my time efficiently'], [q('What is your usual daily routine?', 'experience'), q('What part of the day do you enjoy most?', 'preference'), q('Do you follow the same routine at weekends?', 'frequency'), q('Would you like to change your routine?', 'reason')]),
      t('weekends', 'Weekends', ['take a break from work', 'catch up with friends', 'recharge my batteries'], [q('What do you usually do at weekends?', 'frequency'), q('Do you prefer busy or relaxing weekends?', 'preference'), q('Did you spend weekends differently as a child?', 'experience'), q('Why are weekends important?', 'reason')]),
      t('neighbourhood', 'Neighbourhood', ['a peaceful neighbourhood', 'local facilities', 'within walking distance'], [q('What is your neighbourhood like?', 'experience'), q('Do you know many of your neighbours?', 'experience'), q('What facilities are close to your home?', 'experience'), q('Would you recommend your area to other people?', 'reason')]),
      t('weather', 'Weather', ['mild weather', 'a sudden change in temperature', 'bright and sunny'], [q('What kind of weather do you like most?', 'preference'), q('What is the weather usually like where you live?', 'experience'), q('Does the weather affect your mood?', 'reason'), q('Do you often check the weather forecast?', 'frequency')]),
    ],
  },
  {
    day: 2,
    title: 'Media & Entertainment',
    subtitle: 'Music, films, books, social media and digital habits.',
    topics: [
      t('music', 'Music', ['listen to music on the go', 'a catchy melody', 'help me unwind'], [q('Do you like listening to music?', 'preference'), q('What kind of music do you usually listen to?', 'preference'), q('When do you normally listen to music?', 'frequency'), q('Has your taste in music changed over time?', 'experience')]),
      t('films', 'Films', ['a gripping storyline', 'watch a film at home', 'a memorable character'], [q('Do you enjoy watching films?', 'preference'), q('What kinds of films do you like?', 'preference'), q('How often do you watch films?', 'frequency'), q('Do you prefer watching films at home or at the cinema?', 'preference')]),
      t('tv', 'Television', ['watch a series', 'educational programmes', 'stream content online'], [q('Do you watch much television?', 'frequency'), q('What programmes do you enjoy?', 'preference'), q('Did you watch more TV when you were younger?', 'experience'), q('Do you think television is still popular?', 'reason')]),
      t('books', 'Books', ['a thought-provoking book', 'get absorbed in a story', 'broaden my horizons'], [q('Do you enjoy reading books?', 'preference'), q('What kind of books do you like?', 'preference'), q('How often do you buy books?', 'frequency'), q('Is there a book you would like to read again?', 'experience')]),
      t('reading', 'Reading Habits', ['read on a regular basis', 'skim through an article', 'improve my concentration'], [q('How often do you read?', 'frequency'), q('Do you prefer paper books or digital texts?', 'preference'), q('What do you usually read online?', 'frequency'), q('Did you enjoy reading as a child?', 'experience')]),
      t('social-media', 'Social Media', ['scroll through my feed', 'keep up with friends', 'limit screen time'], [q('Which social media platforms do you use?', 'experience'), q('How often do you use social media?', 'frequency'), q('What do you mainly use it for?', 'reason'), q('Would you like to spend less time on it?', 'preference')]),
      t('internet', 'Internet', ['look something up online', 'stay connected', 'depend on the internet'], [q('How often do you use the internet?', 'frequency'), q('What do you mainly use the internet for?', 'reason'), q('Could you live without the internet for a week?', 'reason'), q('How has the internet changed your life?', 'experience')]),
      t('phones', 'Mobile Phones', ['check my phone', 'a useful everyday tool', 'put my phone on silent'], [q('How often do you use your phone?', 'frequency'), q('What do you use your phone for most?', 'reason'), q('When did you get your first phone?', 'experience'), q('Would you like to use your phone less?', 'preference')]),
      t('apps', 'Apps', ['a user-friendly app', 'save a lot of time', 'use it on a daily basis'], [q('What apps do you use most often?', 'frequency'), q('Is there an app you could not live without?', 'preference'), q('Do you pay for any apps?', 'experience'), q('What makes an app useful?', 'reason')]),
      t('photography', 'Photography', ['capture a special moment', 'take candid photos', 'look back on memories'], [q('Do you like taking photos?', 'preference'), q('What do you usually take photos of?', 'frequency'), q('Do you prefer taking photos or being in photos?', 'preference'), q('Do you often look at old photos?', 'frequency')]),
    ],
  },
  {
    day: 3,
    title: 'Food & Shopping',
    subtitle: 'Food, cooking, clothes, money and shopping preferences.',
    topics: [
      t('food', 'Food', ['a balanced diet', 'a traditional dish', 'full of flavour'], [q('What is your favourite food?', 'preference'), q('Do you prefer home-cooked food or fast food?', 'preference'), q('Have your eating habits changed?', 'experience'), q('Is food important in your culture?', 'reason')]),
      t('cooking', 'Cooking', ['cook from scratch', 'follow a simple recipe', 'prepare a quick meal'], [q('Do you enjoy cooking?', 'preference'), q('How often do you cook?', 'frequency'), q('What was the first dish you learned to cook?', 'experience'), q('Would you like to learn to cook something new?', 'preference')]),
      t('restaurants', 'Restaurants', ['eat out with friends', 'good value for money', 'a cosy atmosphere'], [q('How often do you eat at restaurants?', 'frequency'), q('What kind of restaurants do you like?', 'preference'), q('Do you prefer eating out or eating at home?', 'preference'), q('What makes a restaurant good?', 'reason')]),
      t('shopping', 'Shopping', ['shop around', 'make a shopping list', 'an impulse purchase'], [q('Do you enjoy shopping?', 'preference'), q('How often do you go shopping?', 'frequency'), q('What do you usually shop for?', 'experience'), q('Has the way you shop changed?', 'experience')]),
      t('clothes', 'Clothes', ['dress comfortably', 'a smart outfit', 'suit my personal style'], [q('What kind of clothes do you usually wear?', 'frequency'), q('Do you care much about fashion?', 'reason'), q('Do you prefer comfortable or stylish clothes?', 'preference'), q('Have your clothing preferences changed?', 'experience')]),
      t('shoes', 'Shoes', ['a comfortable pair of shoes', 'wear them every day', 'match an outfit'], [q('How many pairs of shoes do you have?', 'experience'), q('What type of shoes do you wear most?', 'frequency'), q('Do you prefer comfort or appearance when buying shoes?', 'preference'), q('Have you ever bought expensive shoes?', 'experience')]),
      t('gifts', 'Gifts', ['a thoughtful gift', 'something meaningful', 'choose a present carefully'], [q('Do you enjoy giving gifts?', 'preference'), q('When do people usually give gifts in your country?', 'frequency'), q('What is the best gift you have received?', 'experience'), q('Do you prefer useful or surprising gifts?', 'preference')]),
      t('money', 'Money', ['save money regularly', 'stick to a budget', 'spend money wisely'], [q('Are you good at saving money?', 'reason'), q('What do you usually spend money on?', 'frequency'), q('Did you save money as a child?', 'experience'), q('Do you prefer saving or spending?', 'preference')]),
      t('markets', 'Markets', ['a local market', 'fresh produce', 'bargain for a better price'], [q('Are there many markets where you live?', 'experience'), q('Do you enjoy visiting markets?', 'preference'), q('What do people usually buy there?', 'frequency'), q('Do you prefer markets or supermarkets?', 'preference')]),
      t('online-shopping', 'Online Shopping', ['place an order online', 'compare prices', 'door-to-door delivery'], [q('How often do you shop online?', 'frequency'), q('What do you usually buy online?', 'experience'), q('What do you like about online shopping?', 'reason'), q('Do you think online shopping will become more popular?', 'reason')]),
    ],
  },
  {
    day: 4,
    title: 'Travel & Transport',
    subtitle: 'Travel habits, transport, holidays and places in a city.',
    topics: [
      t('travel', 'Travel', ['travel to a new place', 'experience a different culture', 'plan a trip in advance'], [q('Do you like travelling?', 'preference'), q('How often do you travel?', 'frequency'), q('What is the most interesting place you have visited?', 'experience'), q('Do you prefer travelling alone or with others?', 'preference')]),
      t('public-transport', 'Public Transport', ['use public transport', 'avoid traffic congestion', 'a reliable service'], [q('Do you often use public transport?', 'frequency'), q('What form of public transport is common in your city?', 'experience'), q('What do you like or dislike about it?', 'reason'), q('Would you use it more if it improved?', 'reason')]),
      t('cars', 'Cars', ['drive to work', 'a fuel-efficient car', 'get stuck in traffic'], [q('Do you drive a car?', 'experience'), q('Would you like to own a car?', 'preference'), q('What kind of car would you choose?', 'preference'), q('Are cars necessary where you live?', 'reason')]),
      t('bicycles', 'Bicycles', ['ride a bike', 'an eco-friendly option', 'a dedicated cycle lane'], [q('Do you ride a bicycle?', 'frequency'), q('Did you learn to ride a bike as a child?', 'experience'), q('Is cycling popular where you live?', 'reason'), q('Would you like to cycle more often?', 'preference')]),
      t('walking', 'Walking', ['go for a walk', 'clear my head', 'within walking distance'], [q('Do you enjoy walking?', 'preference'), q('How much do you walk every day?', 'frequency'), q('Where do you like to go for a walk?', 'preference'), q('Do you think people should walk more?', 'reason')]),
      t('holidays', 'Holidays', ['take a short break', 'go sightseeing', 'switch off from work'], [q('What do you usually do on holiday?', 'frequency'), q('Do you prefer relaxing or active holidays?', 'preference'), q('What was your last holiday like?', 'experience'), q('Where would you like to go next?', 'preference')]),
      t('hotels', 'Hotels', ['stay in a hotel', 'comfortable accommodation', 'friendly customer service'], [q('Have you stayed in many hotels?', 'experience'), q('What is important when choosing a hotel?', 'reason'), q('Do you prefer hotels or rented apartments?', 'preference'), q('Have you ever had a bad hotel experience?', 'experience')]),
      t('maps', 'Maps', ['use a digital map', 'find my way around', 'get lost in an unfamiliar place'], [q('Do you often use maps?', 'frequency'), q('Do you prefer paper maps or digital maps?', 'preference'), q('Are you good at finding your way?', 'reason'), q('Have you ever got lost?', 'experience')]),
      t('parks', 'Parks', ['a green open space', 'spend time outdoors', 'a peaceful escape'], [q('Are there many parks near your home?', 'experience'), q('How often do you visit a park?', 'frequency'), q('What do you usually do there?', 'frequency'), q('Why are parks important in cities?', 'reason')]),
      t('cities', 'Cities', ['a vibrant city', 'a wide range of facilities', 'a fast-paced lifestyle'], [q('Do you enjoy living in a city?', 'preference'), q('What do you like about cities?', 'reason'), q('What problems do big cities have?', 'reason'), q('Would you like to live in another city?', 'preference')]),
    ],
  },
  {
    day: 5,
    title: 'Lifestyle & Wellbeing',
    subtitle: 'Sports, health, routines, free time and relaxation.',
    topics: [
      t('sports', 'Sports', ['play a team sport', 'keep fit', 'a competitive match'], [q('Do you like sports?', 'preference'), q('What sports are popular in your country?', 'experience'), q('Did you play sports at school?', 'experience'), q('Do you prefer watching or playing sports?', 'preference')]),
      t('exercise', 'Exercise', ['work out regularly', 'stay physically active', 'build a healthy habit'], [q('How often do you exercise?', 'frequency'), q('What kind of exercise do you enjoy?', 'preference'), q('Do you prefer exercising alone or with others?', 'preference'), q('Why is exercise important?', 'reason')]),
      t('health', 'Health', ['maintain a healthy lifestyle', 'eat nutritious food', 'take care of my health'], [q('What do you do to stay healthy?', 'frequency'), q('Do you think you have a healthy lifestyle?', 'reason'), q('Has your attitude to health changed?', 'experience'), q('What healthy habit would you like to develop?', 'preference')]),
      t('sleep', 'Sleep', ['get enough sleep', 'have a good night’s sleep', 'feel well-rested'], [q('How many hours do you usually sleep?', 'frequency'), q('Do you find it easy to fall asleep?', 'experience'), q('Do you ever take naps?', 'frequency'), q('Why is sleep important?', 'reason')]),
      t('morning', 'Morning', ['start the day early', 'have a productive morning', 'feel more energetic'], [q('Are you a morning person?', 'preference'), q('What do you usually do first in the morning?', 'frequency'), q('Do you prefer mornings or evenings?', 'preference'), q('Has your morning routine changed?', 'experience')]),
      t('happiness', 'Happiness', ['put me in a good mood', 'feel grateful for', 'simple everyday pleasures'], [q('What usually makes you happy?', 'reason'), q('Are you happier now than when you were younger?', 'experience'), q('Do small things make you happy?', 'reason'), q('Is it important to make other people happy?', 'reason')]),
      t('relaxation', 'Relaxation', ['unwind after a long day', 'clear my mind', 'take some time for myself'], [q('What do you do to relax?', 'frequency'), q('How often do you have time to relax?', 'frequency'), q('Do you prefer relaxing alone or with others?', 'preference'), q('Why is relaxation important?', 'reason')]),
      t('free-time', 'Free Time', ['have some spare time', 'make the most of my free time', 'take a break from studying'], [q('How much free time do you have?', 'frequency'), q('What do you usually do in your free time?', 'frequency'), q('Do you prefer indoor or outdoor activities?', 'preference'), q('Would you like to have more free time?', 'reason')]),
      t('hobbies', 'Hobbies', ['take up a hobby', 'do something creative', 'improve a skill over time'], [q('Do you have any hobbies?', 'experience'), q('How long have you had this hobby?', 'experience'), q('Did you have different hobbies as a child?', 'experience'), q('Would you like to start a new hobby?', 'preference')]),
      t('games', 'Games', ['play a board game', 'a relaxing way to pass time', 'play against friends'], [q('Do you like playing games?', 'preference'), q('What games do you enjoy?', 'preference'), q('Did you play more games as a child?', 'experience'), q('Do you prefer online games or traditional games?', 'preference')]),
    ],
  },
  {
    day: 6,
    title: 'Education & Learning',
    subtitle: 'School, subjects, languages, handwriting and cultural learning.',
    topics: [
      t('school', 'School', ['school days', 'a positive learning environment', 'make progress academically'], [q('Did you enjoy school?', 'experience'), q('What was your school like?', 'experience'), q('What did you like most about school?', 'preference'), q('Would you like to go back to school for one day?', 'preference')]),
      t('subjects', 'School Subjects', ['my strongest subject', 'find a subject challenging', 'develop useful skills'], [q('What was your favourite subject at school?', 'preference'), q('Which subject did you find difficult?', 'experience'), q('Are school subjects different now?', 'experience'), q('What subject should every student learn?', 'reason')]),
      t('maths', 'Mathematics', ['solve a problem', 'work with numbers', 'logical thinking'], [q('Did you enjoy maths at school?', 'preference'), q('Are you good at maths?', 'reason'), q('How often do you use maths in daily life?', 'frequency'), q('Do you think maths is important?', 'reason')]),
      t('science', 'Science', ['scientific discovery', 'understand how things work', 'learn through experiments'], [q('Did you study science at school?', 'experience'), q('Which area of science interests you most?', 'preference'), q('Do you watch science programmes?', 'frequency'), q('Why is science important?', 'reason')]),
      t('history', 'History', ['learn about the past', 'a major historical event', 'understand cultural heritage'], [q('Do you like history?', 'preference'), q('Did you study history at school?', 'experience'), q('Is there a historical period that interests you?', 'preference'), q('Why should people learn history?', 'reason')]),
      t('art', 'Art', ['express creativity', 'visit an art gallery', 'a visually striking work'], [q('Do you like art?', 'preference'), q('Did you enjoy art classes at school?', 'experience'), q('How often do you visit galleries or exhibitions?', 'frequency'), q('Would you like to learn an artistic skill?', 'preference')]),
      t('languages', 'Languages', ['learn a foreign language', 'communicate confidently', 'build my vocabulary'], [q('What languages can you speak?', 'experience'), q('Which language would you like to learn?', 'preference'), q('How do you practise English?', 'frequency'), q('Why is learning languages useful?', 'reason')]),
      t('handwriting', 'Handwriting', ['write by hand', 'clear and neat handwriting', 'take handwritten notes'], [q('Do you often write by hand?', 'frequency'), q('Do you think your handwriting is good?', 'reason'), q('Did you write more by hand as a child?', 'experience'), q('Will handwriting become less common?', 'reason')]),
      t('libraries', 'Libraries', ['borrow a book', 'a quiet study space', 'access reliable resources'], [q('Do you visit libraries?', 'frequency'), q('What do you usually do in a library?', 'frequency'), q('Did you use libraries more when you were younger?', 'experience'), q('Do we still need libraries today?', 'reason')]),
      t('museums', 'Museums', ['learn something new', 'an interactive exhibition', 'preserve cultural heritage'], [q('Do you enjoy visiting museums?', 'preference'), q('How often do you visit museums?', 'frequency'), q('What was the last museum you visited?', 'experience'), q('Should children visit museums more often?', 'reason')]),
    ],
  },
  {
    day: 7,
    title: 'Nature & Environment',
    subtitle: 'Animals, plants, countryside and environmental habits.',
    topics: [
      t('animals', 'Animals', ['wild animals', 'protect natural habitats', 'learn about animal behaviour'], [q('Do you like animals?', 'preference'), q('What is your favourite animal?', 'preference'), q('Did you learn about animals at school?', 'experience'), q('Should children spend more time learning about animals?', 'reason')]),
      t('pets', 'Pets', ['keep a pet', 'a loyal companion', 'take care of an animal'], [q('Do you have a pet?', 'experience'), q('Did you have pets as a child?', 'experience'), q('What pet would you like to have?', 'preference'), q('Why do people keep pets?', 'reason')]),
      t('flowers', 'Flowers', ['fresh flowers', 'brighten up a room', 'give flowers as a gift'], [q('Do you like flowers?', 'preference'), q('What flowers are common in your country?', 'experience'), q('Have you ever given flowers to someone?', 'experience'), q('Do people often use flowers for celebrations?', 'frequency')]),
      t('plants', 'Plants', ['grow plants at home', 'look after a plant', 'add some greenery'], [q('Do you keep plants at home?', 'experience'), q('Are you good at looking after plants?', 'reason'), q('Did you learn to grow plants as a child?', 'experience'), q('Would you like to have a garden?', 'preference')]),
      t('trees', 'Trees', ['provide shade', 'improve air quality', 'plant more trees'], [q('Are there many trees where you live?', 'experience'), q('Do you have a favourite kind of tree?', 'preference'), q('Did you climb trees as a child?', 'experience'), q('Why are trees important in cities?', 'reason')]),
      t('nature', 'Nature', ['spend time in nature', 'get away from city noise', 'natural scenery'], [q('Do you enjoy spending time in nature?', 'preference'), q('How often do you go to natural places?', 'frequency'), q('What natural place do you like most?', 'preference'), q('Why do people need contact with nature?', 'reason')]),
      t('environment', 'Environment', ['protect the environment', 'reduce pollution', 'make sustainable choices'], [q('Are environmental issues important to you?', 'reason'), q('What environmental problems exist in your area?', 'experience'), q('What do you personally do to help?', 'frequency'), q('Should schools teach more about the environment?', 'reason')]),
      t('recycling', 'Recycling', ['sort household waste', 'recycle plastic and paper', 'reduce unnecessary waste'], [q('Do you recycle at home?', 'frequency'), q('Is recycling easy where you live?', 'experience'), q('What things do you usually recycle?', 'frequency'), q('How could people be encouraged to recycle more?', 'reason')]),
      t('beaches', 'Beaches', ['walk along the beach', 'spend time by the sea', 'a relaxing coastal atmosphere'], [q('Do you like beaches?', 'preference'), q('How often do you go to the beach?', 'frequency'), q('What do you usually do there?', 'frequency'), q('Would you like to live near the sea?', 'preference')]),
      t('countryside', 'Countryside', ['peaceful rural area', 'fresh air and open space', 'escape the busy city'], [q('Do you enjoy visiting the countryside?', 'preference'), q('How often do you go there?', 'frequency'), q('What do people do in the countryside?', 'experience'), q('Would you like to live there?', 'preference')]),
    ],
  },
  {
    day: 8,
    title: 'Life Events & Memories',
    subtitle: 'Celebrations, traditions, childhood and memories.',
    topics: [
      t('birthdays', 'Birthdays', ['celebrate a birthday', 'spend time with loved ones', 'a memorable occasion'], [q('Do you enjoy birthdays?', 'preference'), q('How do you usually celebrate your birthday?', 'frequency'), q('Were birthdays important when you were a child?', 'experience'), q('What makes a birthday special?', 'reason')]),
      t('celebrations', 'Celebrations', ['mark a special occasion', 'get together with family', 'create happy memories'], [q('Do you enjoy celebrations?', 'preference'), q('What celebrations are important in your family?', 'experience'), q('Do you prefer large or small celebrations?', 'preference'), q('Why do people celebrate special events?', 'reason')]),
      t('festivals', 'Festivals', ['a traditional festival', 'take part in celebrations', 'a festive atmosphere'], [q('What festivals are popular in your country?', 'experience'), q('Do you enjoy festivals?', 'preference'), q('How did you celebrate festivals as a child?', 'experience'), q('Why are festivals important?', 'reason')]),
      t('traditions', 'Traditions', ['follow a family tradition', 'pass traditions on', 'preserve cultural identity'], [q('Are traditions important in your family?', 'reason'), q('What tradition do you like most?', 'preference'), q('Have any traditions changed over time?', 'experience'), q('Should young people continue old traditions?', 'reason')]),
      t('names', 'Names', ['have a meaningful name', 'be named after someone', 'a common name'], [q('Does your name have a special meaning?', 'experience'), q('Do you like your name?', 'preference'), q('Is your name common in your country?', 'experience'), q('How do parents choose names for children?', 'reason')]),
      t('childhood', 'Childhood', ['a happy childhood memory', 'grow up in', 'spend time outdoors'], [q('Did you have a happy childhood?', 'experience'), q('What did you enjoy doing as a child?', 'experience'), q('Where did you spend most of your childhood?', 'experience'), q('Would you like to be a child again?', 'preference')]),
      t('toys', 'Toys', ['a favourite childhood toy', 'play imaginative games', 'keep an old toy'], [q('What toys did you like as a child?', 'experience'), q('Did you have a favourite toy?', 'experience'), q('Do children have too many toys today?', 'reason'), q('Would you keep old toys for the future?', 'preference')]),
      t('memories', 'Memories', ['a vivid memory', 'look back fondly on', 'bring back memories'], [q('Do you have a good memory?', 'reason'), q('What kind of things do you remember easily?', 'experience'), q('Do photos help you remember the past?', 'reason'), q('What is one memory you will never forget?', 'experience')]),
      t('older-people', 'Older People', ['learn from experience', 'give practical advice', 'spend time with older relatives'], [q('Do you spend much time with older people?', 'frequency'), q('What can young people learn from older people?', 'reason'), q('Did your grandparents influence you?', 'experience'), q('Do you enjoy talking to older people?', 'preference')]),
      t('young-people', 'Young People', ['full of energy', 'face modern pressures', 'adapt quickly to change'], [q('Do you spend much time with younger people?', 'frequency'), q('What are young people interested in today?', 'experience'), q('Are young people different from previous generations?', 'reason'), q('What is the best thing about being young?', 'reason')]),
    ],
  },
  {
    day: 9,
    title: 'Goals & Character',
    subtitle: 'Ambitions, success, teamwork, decisions and personal qualities.',
    topics: [
      t('dreams', 'Dreams & Ambitions', ['set an ambitious goal', 'work towards a dream', 'stay motivated'], [q('What is one ambition you have?', 'experience'), q('Have your ambitions changed over time?', 'experience'), q('Do you often think about the future?', 'frequency'), q('What helps people achieve their dreams?', 'reason')]),
      t('future-plans', 'Future Plans', ['make long-term plans', 'keep my options open', 'take the next step'], [q('Do you make plans for the future?', 'frequency'), q('What are your plans for the next few years?', 'experience'), q('Do you prefer planning or being spontaneous?', 'preference'), q('Can plans sometimes change completely?', 'reason')]),
      t('success', 'Success', ['achieve a goal', 'feel proud of an achievement', 'measure success personally'], [q('What does success mean to you?', 'reason'), q('Do you consider yourself successful?', 'reason'), q('What achievement are you proud of?', 'experience'), q('Is money an important part of success?', 'reason')]),
      t('jobs', 'Jobs', ['a rewarding career', 'job satisfaction', 'develop professional skills'], [q('What job would you like to do in the future?', 'preference'), q('What makes a job attractive?', 'reason'), q('Would you prefer a high salary or enjoyable work?', 'preference'), q('Has your ideal job changed?', 'experience')]),
      t('leadership', 'Leadership', ['take responsibility', 'lead by example', 'make confident decisions'], [q('Do you like being a leader?', 'preference'), q('Have you ever led a team?', 'experience'), q('What makes someone a good leader?', 'reason'), q('Can leadership skills be learned?', 'reason')]),
      t('teamwork', 'Teamwork', ['work as part of a team', 'share responsibilities', 'communicate effectively'], [q('Do you enjoy working in a team?', 'preference'), q('When did you last work in a team?', 'experience'), q('What makes teamwork successful?', 'reason'), q('Do you sometimes prefer working alone?', 'preference')]),
      t('patience', 'Patience', ['stay calm', 'wait patiently', 'deal with delays'], [q('Are you a patient person?', 'reason'), q('What situations make you impatient?', 'experience'), q('Were you more impatient as a child?', 'experience'), q('Why is patience useful?', 'reason')]),
      t('challenges', 'Challenges', ['face a challenge', 'step outside my comfort zone', 'learn from difficulties'], [q('Do you enjoy challenges?', 'preference'), q('What is a recent challenge you faced?', 'experience'), q('How do you deal with difficult situations?', 'frequency'), q('Can challenges make people stronger?', 'reason')]),
      t('decisions', 'Decisions', ['make an important decision', 'weigh up the options', 'trust my judgement'], [q('Are you good at making decisions?', 'reason'), q('Do you make decisions quickly?', 'frequency'), q('What is an important decision you made recently?', 'experience'), q('Do you ask other people for advice?', 'frequency')]),
      t('helping', 'Helping Others', ['lend someone a hand', 'offer practical support', 'make a positive difference'], [q('Do you often help other people?', 'frequency'), q('Who do you usually help?', 'experience'), q('When did someone last help you?', 'experience'), q('Why is helping others important?', 'reason')]),
    ],
  },
  {
    day: 10,
    title: 'Modern Life',
    subtitle: 'Everyday objects, communication, technology and the future.',
    topics: [
      t('mirrors', 'Mirrors', ['look in the mirror', 'check my appearance', 'a full-length mirror'], [q('How often do you look in a mirror?', 'frequency'), q('Do you have many mirrors at home?', 'experience'), q('Have you ever bought a mirror?', 'experience'), q('Do mirrors make a room look different?', 'reason')]),
      t('noise', 'Noise', ['a noisy environment', 'background noise', 'need peace and quiet'], [q('Is your neighbourhood noisy?', 'experience'), q('What kinds of noise bother you?', 'preference'), q('Do you prefer quiet or lively places?', 'preference'), q('How do you deal with unwanted noise?', 'frequency')]),
      t('colours', 'Colours', ['a bright colour', 'match different colours', 'create a calm atmosphere'], [q('What is your favourite colour?', 'preference'), q('Do colours affect your mood?', 'reason'), q('What colours do you usually wear?', 'frequency'), q('Did you have a favourite colour as a child?', 'experience')]),
      t('numbers', 'Numbers', ['remember a number', 'work with figures', 'a lucky number'], [q('Do you have a favourite number?', 'preference'), q('Are you good at remembering numbers?', 'reason'), q('Do you use numbers a lot in daily life?', 'frequency'), q('Are some numbers considered lucky in your culture?', 'experience')]),
      t('emails', 'Emails', ['send a quick email', 'check my inbox', 'formal written communication'], [q('How often do you send emails?', 'frequency'), q('What do you usually use email for?', 'reason'), q('Do you prefer emails or instant messages?', 'preference'), q('Did you use email more in the past?', 'experience')]),
      t('news', 'News', ['keep up with current events', 'a reliable news source', 'read the headlines'], [q('How often do you follow the news?', 'frequency'), q('Where do you usually get news from?', 'experience'), q('What kind of news interests you most?', 'preference'), q('Do you think people follow too much news?', 'reason')]),
      t('advertising', 'Advertisements', ['an eye-catching advert', 'promote a product', 'influence buying decisions'], [q('Do you notice advertisements?', 'frequency'), q('Where do you see most advertisements?', 'experience'), q('Is there an advertisement you remember well?', 'experience'), q('Do advertisements influence what you buy?', 'reason')]),
      t('time-management', 'Time Management', ['plan my day', 'prioritise important tasks', 'meet a deadline'], [q('Are you good at managing your time?', 'reason'), q('Do you make daily plans?', 'frequency'), q('What usually wastes your time?', 'experience'), q('Would you like to be more organised?', 'preference')]),
      t('technology', 'Technology', ['use technology every day', 'make life more convenient', 'keep up with new devices'], [q('What technology do you use most often?', 'frequency'), q('Are you interested in new technology?', 'preference'), q('Has technology made your life easier?', 'experience'), q('Could you live without modern technology?', 'reason')]),
      t('ai-robots', 'AI & Robots', ['artificial intelligence', 'automate routine tasks', 'work alongside technology'], [q('Are you interested in artificial intelligence?', 'preference'), q('Do you use any AI tools?', 'frequency'), q('Would you like to have a robot at home?', 'preference'), q('How might AI change daily life?', 'reason')]),
    ],
  },
];

export function usefulPhrases(topic: SpeakingTopic, question: SpeakingQuestion) {
  return [...QUESTION_STARTERS[question.kind], ...topic.language];
}
