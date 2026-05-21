// src/components/CertificatePDF.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts from Google Fonts CDN
Font.register({
  family: 'DancingScript',
  src: 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup8hNX6plRP.woff2',
  fontWeight: 'normal',
});

const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Helvetica',
  },
  outerBorder: {
    margin: 30,
    border: '3px solid #d4af37',
    padding: 4,
    width: 'calc(100% - 60px)',
    height: 'calc(100% - 60px)',
  },
  innerBorder: {
    border: '1px solid #d4af37',
    padding: 40,
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafaf9',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 14,
    color: '#78716c',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 42,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#78716c',
    marginTop: 8,
    letterSpacing: 6,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica',
  },
  divider: {
    width: 120,
    height: 2,
    backgroundColor: '#d4af37',
    marginVertical: 20,
  },
  body: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  presentText: {
    fontSize: 18,
    color: '#57534e',
    marginBottom: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica',
  },
  studentName: {
    fontSize: 48,
    fontFamily: 'Helvetica-Oblique',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
    textDecoration: 'underline',
    textDecorationColor: '#d4af37',
  },
  achievementText: {
    fontSize: 16,
    color: '#57534e',
    textAlign: 'center',
    lineHeight: 1.6,
    maxWidth: 500,
    fontFamily: 'Helvetica',
  },
  scoreBadge: {
    marginTop: 20,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 50,
    border: '2px solid #d4af37',
  },
  scoreText: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 40,
    marginTop: 30,
  },
  signatureBlock: {
    alignItems: 'center',
    width: 200,
  },
  signatureLine: {
    width: 180,
    height: 1,
    backgroundColor: '#1e3a8a',
    marginBottom: 8,
  },
  signatureText: {
    fontSize: 12,
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: 'Helvetica',
  },
  signatureName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Oblique',
    color: '#0f172a',
    marginBottom: 4,
  },
  dateBlock: {
    alignItems: 'center',
    width: 200,
  },
  dateText: {
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  seal: {
    position: 'absolute',
    bottom: 60,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    border: '3px solid #d4af37',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    opacity: 0.9,
  },
  sealText: {
    fontSize: 10,
    color: '#92400e',
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-30deg)',
    fontSize: 120,
    color: '#e7e5e4',
    opacity: 0.15,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 10,
  },
});

interface CertificateProps {
  studentName: string;
  subject: string;
  date: string;
  teacherName: string;
  score?: number;
}

export const CertificatePDF = ({ studentName, subject, date, teacherName, score = 95 }: CertificateProps) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.outerBorder}>
        <View style={styles.innerBorder}>
          {/* Watermark */}
          <Text style={styles.watermark}>NAFS</Text>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>NAFS Preparation Portal</Text>
            <Text style={styles.title}>Certificate of Excellence</Text>
            <Text style={styles.subtitle}>Official Achievement</Text>
            <View style={styles.divider} />
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.presentText}>This Certifies That</Text>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.achievementText}>
              Has successfully demonstrated mastery in the NAFS {subject} Assessment, meeting all required learning outcomes and indicators with distinction.
            </Text>

            {/* Score Badge */}
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>Score: {score}%</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateText}>{date}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>Date of Issue</Text>
            </View>

            <View style={styles.signatureBlock}>
              <Text style={styles.signatureName}>{teacherName}</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureText}>Instructor & Director</Text>
            </View>
          </View>

          {/* Seal */}
          <View style={styles.seal}>
            <Text style={styles.sealText}>Verified</Text>
            <Text style={styles.sealText}>NAFS</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);