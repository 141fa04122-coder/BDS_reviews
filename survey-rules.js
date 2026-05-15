// Intelligent survey flow rules
// Each question can conditionally show the next question

const questions = [
  {
    id: 'overall_rating',
    type: 'rating',
    question: 'How would you rate your overall experience?',
    required: true,
    options: [
      { value: 5, label: '⭐️⭐️⭐️⭐️⭐️ Excellent' },
      { value: 4, label: '⭐️⭐️⭐️⭐️ Good' },
      { value: 3, label: '⭐️⭐️⭐️ Average' },
      { value: 2, label: '⭐️⭐️ Poor' },
      { value: 1, label: '⭐️ Terrible' }
    ],
    nextCondition: (answer) => {
      if (answer <= 2) return 'disliked_reasons';
      if (answer === 3) return 'improvements_suggestions';
      return 'like_food';
    }
  },
  {
    id: 'disliked_reasons',
    type: 'checkbox',
    question: 'What didn\'t you like? (Select all that apply)',
    options: [
      { value: 'taste', label: 'Taste was not good' },
      { value: 'cold', label: 'Food was cold' },
      { value: 'late', label: 'Delivery was late' },
      { value: 'packaging', label: 'Packaging issue' },
      { value: 'quantity', label: 'Less quantity' },
      { value: 'other', label: 'Other' }
    ],
    nextCondition: () => 'like_food'
  },
  {
    id: 'improvements_suggestions',
    type: 'checkbox',
    question: 'What could be improved?',
    options: [
      { value: 'taste', label: 'Taste quality' },
      { value: 'speed', label: 'Faster delivery' },
      { value: 'packaging', label: 'Better packaging' },
      { value: 'portion', label: 'Larger portions' },
      { value: 'temperature', label: 'Hotter food' }
    ],
    nextCondition: () => 'like_food'
  },
  {
    id: 'like_food',
    type: 'radio',
    question: 'Did you like the food?',
    required: true,
    options: [
      { value: 'yes', label: 'Yes, loved it!' },
      { value: 'no', label: 'Not really' },
      { value: 'some', label: 'It was okay' }
    ],
    nextCondition: (answer) => {
      if (answer === 'yes') return 'favourite_dishes';
      return 'what_went_wrong';
    }
  },
  {
    id: 'what_went_wrong',
    type: 'checkbox',
    question: 'What didn\'t meet your expectations?',
    options: [
      { value: 'taste', label: 'Taste' },
      { value: 'spice', label: 'Spice level' },
      { value: 'freshness', label: 'Freshness' },
      { value: 'presentation', label: 'Presentation' },
      { value: 'value', label: 'Value for money' }
    ],
    nextCondition: () => 'favourite_dishes'
  },
  {
    id: 'favourite_dishes',
    type: 'checkbox',
    question: 'Which dishes did you order? (Select all that you tried)',
    required: true,
    options: [
      { value: 'hyderabadi_biryani', label: 'Hyderabadi Biryani' },
      { value: 'lucknowi_biryani', label: 'Lucknowi Biryani' },
      { value: 'mutton_biryani', label: 'Mutton Biryani' },
      { value: 'chicken_biryani', label: 'Chicken Biryani' },
      { value: 'veg_biryani', label: 'Veg Biryani' },
      { value: 'keema_salad', label: 'Keema Salad' },
      { value: 'raita', label: 'Raita' },
      { value: 'salan', label: 'Mirchi Salan' },
      { value: 'roti', label: 'Roti/Paratha' },
      { value: 'biryani_drink', label: 'Biryani Special Drink' },
      { value: 'lassi', label: 'Lassi' },
      { value: 'soda', label: 'Cold Drinks/Soda' }
    ],
    nextCondition: (answers) => {
      if (answers.includes('hyderabadi_biryani') || answers.includes('lucknowi_biryani')) {
        return 'biryani_quality';
      }
      return 'visit_frequency';
    }
  },
  {
    id: 'biryani_quality',
    type: 'radio',
    question: 'How was the Biryani quality?',
    options: [
      { value: 'perfect', label: 'Perfect - Authentic flavors' },
      { value: 'good', label: 'Good - tasty but could be better' },
      { value: 'average', label: 'Average - nothing special' },
      { value: 'poor', label: 'Poor - not up to mark' }
    ],
    nextCondition: () => 'visit_frequency'
  },
  {
    id: 'visit_frequency',
    type: 'radio',
    question: 'How often do you order from us?',
    required: true,
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'few_times_week', label: 'A few times a week' },
      { value: 'weekly', label: 'Once a week' },
      { value: 'monthly', label: 'Once a month' },
      { value: 'first_time', label: 'This was my first order' }
    ],
    nextCondition: (answer) => {
      if (answer === 'first_time') return 'how_found';
      return 'food_preferences';
    }
  },
  {
    id: 'how_found',
    type: 'radio',
    question: 'How did you hear about us?',
    options: [
      { value: 'friends', label: 'Friends/Family' },
      { value: 'social_media', label: 'Social Media' },
      { value: 'delivery_app', label: 'Delivery App (UberEats/Deliveroo)' },
      { value: 'google', label: 'Google Search' },
      { value: 'walked_past', label: 'Walked past the location' },
      { value: 'qr_code', label: 'QR Code (this one!)' }
    ],
    nextCondition: () => 'food_preferences'
  },
  {
    id: 'food_preferences',
    type: 'checkbox',
    question: 'What type of food do you usually prefer?',
    required: true,
    options: [
      { value: 'spicy', label: 'Very Spicy' },
      { value: 'medium', label: 'Medium Spice' },
      { value: 'mild', label: 'Mild' },
      { value: 'bbq', label: 'BBQ/Grilled' },
      { value: 'curries', label: 'Curries' },
      { value: 'biryanis', label: 'Biryani Special' },
      { value: 'vegetarian', label: 'Vegetarian' },
      { value: 'healthy', label: 'Healthy options' }
    ],
    nextCondition: () => 'cares_about_offers'
  },
  {
    id: 'cares_about_offers',
    type: 'radio',
    question: 'What matters more to you?',
    required: true,
    options: [
      { value: 'taste', label: 'Taste & Quality (willing to pay premium)' },
      { value: 'offers', label: 'Best deals & discounts' },
      { value: 'speed', label: 'Fast delivery' },
      { value: 'value', label: 'Good portion size for price' }
    ],
    nextCondition: () => 'ambiance_preference'
  },
  {
    id: 'ambiance_preference',
    type: 'checkbox',
    question: 'What kind of dining experience do you prefer?',
    required: true,
    options: [
      { value: 'couple', label: 'Couple friendly' },
      { value: 'family', label: 'Family friendly' },
      { value: 'kids', label: 'Kids friendly' },
      { value: 'students', label: 'Student budget' },
      { value: 'quick', label: 'Quick bite/takeaway' },
      { value: 'group', label: 'Group dining' },
      { value: 'none', label: 'I mostly order delivery' }
    ],
    nextCondition: (answers) => {
      if (answers.includes('group') || answers.includes('family')) {
        return 'combo_deals_interest';
      }
      return 'special_requests';
    }
  },
  {
    id: 'combo_deals_interest',
    type: 'radio',
    question: 'Which combo/deal would make you order more often?',
    options: [
      { value: 'family_pack', label: 'Family pack (Biryani + Raita + Salad + Drinks)' },
      { value: 'couple_date', label: 'Couple date package' },
      { value: 'student_combo', label: 'Student budget combo' },
      { value: 'office_lunch', label: 'Office lunch bundle' },
      { value: 'party_pack', label: 'Party pack for groups' }
    ],
    nextCondition: () => 'special_requests'
  },
  {
    id: 'special_requests',
    type: 'checkbox',
    question: 'What would you like to see on your next visit?',
    options: [
      { value: 'new_dishes', label: 'New dishes/seasonal specials' },
      { value: 'healthier_options', label: 'Healthier/low-calorie options' },
      { value: 'vegan_options', label: 'Vegan/vegetarian focus' },
      { value: 'spice_levels', label: 'Customizable spice levels' },
      { value: 'desserts', label: 'More desserts & drinks' },
      { value: 'loyalty', label: 'Loyalty program/rewards' },
      { value: 'subscription', label: 'Meal subscription' },
      { value: 'nothing', label: 'Keep it as it is!' }
    ],
    nextCondition: () => 'recommendation'
  },
  {
    id: 'recommendation',
    type: 'radio',
    question: 'Would you recommend us to friends/family?',
    required: true,
    options: [
      { value: 'definitely', label: 'Definitely!' },
      { value: 'probably', label: 'Probably' },
      { value: 'not_sure', label: 'Not sure' },
      { value: 'probably_not', label: 'Probably not' },
      { value: 'never', label: 'Never' }
    ],
    nextCondition: () => 'additional_comments'
  },
  {
    id: 'additional_comments',
    type: 'textarea',
    question: 'Any other suggestions or comments?',
    optional: true,
    maxLength: 500,
    nextCondition: () => 'wants_to_return'
  },
  {
    id: 'wants_to_return',
    type: 'radio',
    question: 'Will you order from us again?',
    required: true,
    options: [
      { value: 'yes', label: 'Yes, soon!' },
      { value: 'maybe', label: 'Maybe, depending on offers' },
      { value: 'no', label: 'No' }
    ],
    nextCondition: null // End of survey
  }
];

// Get first question
function getFirstQuestion() {
  return questions[0];
}

// Get next question based on current answer and question ID
function getNextQuestion(currentQuestionId, answer) {
  const currentQuestion = questions.find(q => q.id === currentQuestionId);
  if (!currentQuestion || !currentQuestion.nextCondition) {
    return null;
  }

  const nextQuestionId = currentQuestion.nextCondition(answer);
  if (!nextQuestionId) {
    return null;
  }

  return questions.find(q => q.id === nextQuestionId);
}

// Get question by ID
function getQuestion(questionId) {
  return questions.find(q => q.id === questionId);
}

module.exports = {
  questions,
  getFirstQuestion,
  getNextQuestion,
  getQuestion
};
