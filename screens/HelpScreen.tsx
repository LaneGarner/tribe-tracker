import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext, getColors } from '../theme/ThemeContext';

export default function HelpScreen() {
  const { colorScheme } = useContext(ThemeContext);
  const colors = getColors(colorScheme);

  const faqs = [
    {
      question: 'How do I create a challenge?',
      answer:
        'Go to the Challenges tab and tap "Create Challenge". Enter a name, duration, and the daily habits you want to track.',
    },
    {
      question: 'How do I join a challenge?',
      answer:
        'You can browse public challenges in the Challenges tab, or enter an invite code shared by a friend.',
    },
    {
      question: 'How are points calculated?',
      answer:
        'You earn 1 point for each habit you complete daily. Maintaining streaks and completing all habits gives bonus recognition.',
    },
    {
      question: 'What is a streak?',
      answer:
        'A streak counts consecutive days where you checked in at least one habit. Missing a day resets your streak.',
    },
    {
      question: 'Can I leave a challenge?',
      answer:
        'Yes, you can leave any challenge at any time from the challenge detail screen. Your progress will be removed.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Contact Section */}
        <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="mail-outline" size={32} color={colors.primary} />
          <Text style={[styles.contactTitle, { color: colors.text }]}>
            Need more help?
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            Contact us at support@tribetracker.app
          </Text>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Frequently Asked Questions
          </Text>
          {faqs.map((faq, index) => (
            <View
              key={index}
              style={[styles.faqItem, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.faqQuestion, { color: colors.text }]}>
                {faq.question}
              </Text>
              <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                {faq.answer}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  contactCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  faqItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
});
