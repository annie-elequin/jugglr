import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 32,
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  updated: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 32,
  },
  heading: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 24,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: 12,
  },
  link: {
    color: '#A78BFA',
    textDecorationLine: 'underline',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: '#C4B5FD',
  },
})

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#06060F', '#0A0A1A', '#0D0B1F']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <View style={styles.backRow}>
          <Link href="/" asChild>
            <Text style={[styles.backButton, styles.backText]}>← Back</Text>
          </Link>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.updated}>Last updated: March 2026</Text>

          <Text style={styles.body}>
            Jugglr (“we”, “our”, or “the app”) is a task-tracking application. This privacy policy explains how we collect, use, and protect your information when you use Jugglr.
          </Text>

          <Text style={styles.heading}>1. Information we collect</Text>
          <Text style={styles.body}>
            We collect information you provide directly: account credentials (email and password), name (if you choose to set one), and the tasks and subtasks you create (titles, due dates, effort, importance, and completion status). We do not sell your personal information.
          </Text>

          <Text style={styles.heading}>2. How we use your information</Text>
          <Text style={styles.body}>
            We use your information to provide and improve the app: to authenticate you, store and sync your tasks across devices, and operate the service. We may use aggregated or anonymized data for analytics and improving the product.
          </Text>

          <Text style={styles.heading}>3. Data storage and security</Text>
          <Text style={styles.body}>
            Your data is stored on servers of our service providers (e.g. hosting and database providers). We use industry-standard practices to protect your data in transit and at rest. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </Text>

          <Text style={styles.heading}>4. Data retention</Text>
          <Text style={styles.body}>
            We retain your account and task data for as long as your account is active. If you delete your account, we will delete or anonymize your personal data in accordance with our retention policy and applicable law.
          </Text>

          <Text style={styles.heading}>5. Third parties</Text>
          <Text style={styles.body}>
            We rely on third-party services for hosting, databases, and authentication. These providers process data on our behalf and are bound by their own privacy and security obligations. We do not share your personal information with advertisers or data brokers.
          </Text>

          <Text style={styles.heading}>6. Your rights</Text>
          <Text style={styles.body}>
            Depending on where you live, you may have rights to access, correct, delete, or export your personal data, or to object to or restrict certain processing. You can manage your account and data from within the app; for other requests, contact us using the details below.
          </Text>

          <Text style={styles.heading}>7. Children</Text>
          <Text style={styles.body}>
            Jugglr is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us so we can delete it.
          </Text>

          <Text style={styles.heading}>8. Changes to this policy</Text>
          <Text style={styles.body}>
            We may update this privacy policy from time to time. We will post the updated policy on this page and update the “Last updated” date. Continued use of the app after changes constitutes acceptance of the updated policy.
          </Text>

          <Text style={styles.heading}>9. Contact</Text>
          <Text style={styles.body}>
            For questions or requests about this privacy policy or your data, you can contact us at the support or contact option provided in the app, or via the app’s listing (e.g. App Store / Play Store) publisher details.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
