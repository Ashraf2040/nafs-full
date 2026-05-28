// src/components/CertificatePDF.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// A4 Landscape dimensions in points
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 30;

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    padding: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Helvetica',
    position: 'relative',
  },
  // Subtle watermark
  watermark: {
    position: 'absolute',
    top: PAGE_HEIGHT / 2 - 50,
    left: PAGE_WIDTH / 2 - 160,
    fontSize: 90,
    color: '#f0f0f0',
    opacity: 0.15,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 12,
    transform: 'rotate(-25deg)',
  },
  // Main container with golden borders
  outerBorder: {
    margin: MARGIN,
    border: '2.5pt solid #c9a227',
    padding: 2,
    width: PAGE_WIDTH - MARGIN * 2,
    height: PAGE_HEIGHT - MARGIN * 2,
    position: 'relative',
  },
  innerBorder: {
    border: '0.8pt solid #c9a227',
    padding: 25,
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#fefefe',
    position: 'relative',
  },
  // Corner ornaments
  cornerTL: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderTop: '2.5pt solid #c9a227',
    borderLeft: '2.5pt solid #c9a227',
  },
  cornerTR: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderTop: '2.5pt solid #c9a227',
    borderRight: '2.5pt solid #c9a227',
  },
  cornerBL: {
    position: 'absolute',
    bottom: -6,
    left: -6,
    width: 24,
    height: 24,
    borderBottom: '2.5pt solid #c9a227',
    borderLeft: '2.5pt solid #c9a227',
  },
  cornerBR: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 24,
    height: 24,
    borderBottom: '2.5pt solid #c9a227',
    borderRight: '2.5pt solid #c9a227',
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 8,
  },
  logo: {
    fontSize: 10,
    color: '#78716c',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    color: '#78716c',
    marginTop: 3,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica',
  },
  divider: {
    width: 90,
    height: 1.5,
    backgroundColor: '#c9a227',
    marginVertical: 10,
  },
  // Body
  body: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 50,
  },
  presentText: {
    fontSize: 13,
    color: '#57534e',
    marginBottom: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica',
  },
  studentName: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
    borderBottom: '1.5pt solid #c9a227',
    paddingBottom: 6,
    width: '75%',
  },
  subjectBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 16,
    border: '0.8pt solid #bfdbfe',
    marginBottom: 10,
  },
  subjectText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    textAlign: 'center',
  },
  achievementText: {
    fontSize: 12,
    color: '#57534e',
    textAlign: 'center',
    lineHeight: 1.4,
    maxWidth: 450,
    fontFamily: 'Helvetica',
    marginBottom: 12,
  },
  scoreBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 25,
    paddingVertical: 6,
    borderRadius: 20,
    border: '1.5pt solid #c9a227',
    marginBottom: 6,
  },
  scoreText: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    textAlign: 'center',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 50,
    marginTop: 'auto',
    marginBottom: 8,
  },
  signatureBlock: {
    alignItems: 'center',
    width: 160,
  },
  signatureLine: {
    width: 140,
    height: 1,
    backgroundColor: '#1e3a8a',
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 9,
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: 'Helvetica',
  },
  signatureName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 3,
  },
  dateBlock: {
    alignItems: 'center',
    width: 160,
  },
  dateText: {
    fontSize: 12,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  // Seal
  seal: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    border: '1.5pt solid #c9a227',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
  },
  sealText: {
    fontSize: 8,
    color: '#92400e',
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    lineHeight: 1.2,
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
      <Text style={styles.watermark}>NAFS</Text>

      <View style={styles.outerBorder}>
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        <View style={styles.innerBorder}>
          <View style={styles.header}>
            <Text style={styles.logo}>NAFS Preparation Portal</Text>
            <Text style={styles.title}>Certificate of Excellence</Text>
            <Text style={styles.subtitle}>Official Achievement</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.body}>
            <Text style={styles.presentText}>This Certifies That</Text>
            <Text style={styles.studentName}>{studentName}</Text>

            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>NAFS {subject} Assessment</Text>
            </View>

            <Text style={styles.achievementText}>
              Has successfully demonstrated mastery meeting all required learning outcomes and indicators with distinction.
            </Text>

            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>Score: {score}%</Text>
            </View>
          </View>

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

          <View style={styles.seal}>
            <Text style={styles.sealText}>Verified{"\n"}NAFS</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);