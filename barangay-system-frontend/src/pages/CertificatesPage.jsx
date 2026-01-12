// src/pages/CertificatesPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Divider,
  Input,
} from '@mui/material';
import api from '../api';
import jsPDF from 'jspdf';

const CERTIFICATE_TYPES = [
  { value: 'residency', label: 'Certificate of Residency' },
  { value: 'clearance', label: 'Barangay Clearance' },
  { value: 'indigency', label: 'Certificate of Indigency' },
  { value: 'patawag', label: 'Certificate with "Patawag" letter' },
  { value: 'hauling_request', label: 'Hauling Request Letter' },
  { value: 'hauling_certification', label: 'Hauling Certification Letter' },
];

const CertificatesPage = () => {
  const [residents, setResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [certType, setCertType] = useState('residency');
  const [purpose, setPurpose] = useState('');
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [barangayName, setBarangayName] = useState('Barangay Sample');
  const [municipality, setMunicipality] = useState('Sample City');
  const [province, setProvince] = useState('Sample Province');
  const [captainName, setCaptainName] = useState('');
  const [secretaryName, setSecretaryName] = useState('');
  const [placeIssued, setPlaceIssued] = useState('Barangay Hall');
  const [orNumber, setOrNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [leftLogo, setLeftLogo] = useState(null); // Barangay/City seal (left)
  const [centerLogo, setCenterLogo] = useState(null); // Manila seal (center)
  const [rightLogo, setRightLogo] = useState(null); // Bagong Pilipinas logo (right)

  // ---- NEW: officials state comes BEFORE effects that use it
  const [officials, setOfficials] = useState([]);

  // Load residents
  useEffect(() => {
    const loadResidents = async () => {
      try {
        const res = await api.get('/residents');
        setResidents(res.data || []);
      } catch (err) {
        console.error('Error loading residents', err);
        setError('Failed to load residents.');
      }
    };
    loadResidents();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const res = await api.get('/barangay-profile');
        if (res.data) {
          setBarangayName(res.data.barangay_name);
          setMunicipality(res.data.municipality);
          setProvince(res.data.province);
          setPlaceIssued(res.data.place_issued || 'Barangay Hall');
        }
      } catch (err) {
        console.error('Error loading barangay profile', err);
        // optional: setError('Failed to load barangay profile.');
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Load officials
  useEffect(() => {
    const loadOfficials = async () => {
      try {
        const res = await api.get('/officials');
        setOfficials(res.data || []);
      } catch (err) {
        console.error('Error loading officials for certificates', err);
      }
    };
    loadOfficials();
  }, []);

  // When officials change, auto-set captain & secretary names
  useEffect(() => {
    if (!officials.length) return;

    const captain =
      officials.find(
        (o) => o.is_captain || o.position === 'Punong Barangay'
      ) || null;
    const secretary =
      officials.find(
        (o) => o.is_secretary || o.position === 'Barangay Secretary'
      ) || null;

    if (captain) setCaptainName(captain.full_name);
    if (secretary) setSecretaryName(secretary.full_name);
  }, [officials]);

  const selectedResident = useMemo(
    () => residents.find((r) => String(r.id) === String(selectedResidentId)),
    [residents, selectedResidentId]
  );

  const buildFullName = (r) => {
    if (!r) return '';
    const parts = [
      r.first_name,
      r.middle_name ? `${r.middle_name.charAt(0)}.` : '',
      r.last_name,
      r.suffix || '',
    ].filter(Boolean);
    return parts.join(' ');
  };

  const buildCertificateBody = () => {
    if (!selectedResident) return '';

    const fullName = buildFullName(selectedResident);
    const address =
      selectedResident.address ||
      `${barangayName}, ${municipality}, ${province}`;

    const lowerPurpose = purpose
      ? purpose[0].toLowerCase() + purpose.slice(1)
      : '';

    switch (certType) {
      case 'residency':
        return (
          `This is to certify that ${fullName.toUpperCase()}, ` +
          `a resident of ${address}, is a bona fide resident of ${barangayName}, ${municipality}, ${province}. ` +
          `This certification is being issued upon the request of the above-named person ` +
          (purpose
            ? `for ${lowerPurpose}.`
            : 'for whatever legal purpose it may serve.')
        );
      case 'indigency':
        let age = selectedResident.age;
        if (!age && selectedResident.birthdate) {
          const birthDate = new Date(selectedResident.birthdate);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }
        const ageText = age ? `, ${age} years old` : '';
        return (
          `This is to certify that **${fullName.toUpperCase()}**${ageText}, ` +
          `with postal address at ${address}, is a resident of ${barangayName}, ${municipality}, ${province}. ` +
          `This certification is being issued upon the request of the subject person ` +
          (purpose
            ? `for *${purpose}*.`
            : 'for *Proof of Indigency*.')
        );
      case 'clearance':
        return (
          `This is to certify that, based on the records of this Barangay, ` +
          `${fullName.toUpperCase()}, a resident of ${address}, has no derogatory record filed in this office ` +
          `at the time of issuance of this certification. ` +
          (purpose
            ? `This certification is issued upon his/her request for ${lowerPurpose}.`
            : 'This certification is issued upon his/her request for whatever legal purpose it may serve.')
        );
      case 'patawag':
        return (
          `This is to certify that ${fullName.toUpperCase()}, ` +
          `a resident of ${address}, is hereby summoned (PATAWAG) to appear before this Barangay Office ` +
          `for a matter that requires his/her presence. ` +
          (purpose
            ? `This summons is issued for ${lowerPurpose}.`
            : 'This summons is issued for whatever legal purpose it may serve.')
        );
      case 'hauling_request':
        return (
          `This is to request permission for ${fullName.toUpperCase()}, ` +
          `a resident of ${address}, to haul/transport materials or goods ` +
          `within the jurisdiction of ${barangayName}, ${municipality}, ${province}. ` +
          (purpose
            ? `This request is made for ${lowerPurpose}.`
            : 'This request is made for whatever legal purpose it may serve.')
        );
      case 'hauling_certification':
        return (
          `This is to certify that ${fullName.toUpperCase()}, ` +
          `a resident of ${address}, is authorized to haul/transport materials or goods ` +
          `within the jurisdiction of ${barangayName}, ${municipality}, ${province}. ` +
          `This certification is issued to attest that the above-named person has complied with the necessary requirements ` +
          (purpose
            ? `for ${lowerPurpose}.`
            : 'for whatever legal purpose it may serve.')
        );
      default:
        return '';
    }
  };

  const certificateBody = useMemo(buildCertificateBody, [
    selectedResident,
    certType,
    purpose,
    barangayName,
    municipality,
    province,
  ]);

  const handleLeftLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLeftLogo(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCenterLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCenterLogo(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRightLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRightLogo(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneratePdf = async () => {
    setError('');

    if (!selectedResident) {
      setError('Please select a resident.');
      return;
    }

    // Save certificate request to database
    try {
      await api.post('/certificates', {
        resident_id: selectedResident.id,
        certificate_type: CERTIFICATE_TYPES.find((c) => c.value === certType)?.label || certType,
        purpose: purpose || null,
        issue_date: issueDate,
        place_issued: placeIssued,
        or_number: orNumber || null,
        amount: amount || null,
      });
    } catch (err) {
      console.error('Error saving certificate:', err);
      // Continue with PDF generation even if save fails
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'A4',
    });

    // Yellow stripe width (15% of page width)
    const yellowStripeWidth = 210 * 0.15; // ~31.5mm
    const contentStartX = yellowStripeWidth + 3; // Start content after stripe with small margin
    const contentWidth = 210 - yellowStripeWidth - 6; // Available width for content
    const marginX = contentStartX;
    const rightMargin = 210 - marginX; // Right margin for right-aligned text
    let cursorY = 15; // Start higher to accommodate logos

    // Draw yellow vertical stripe on the left
    doc.setFillColor(255, 235, 59); // Yellow color
    doc.rect(0, 0, yellowStripeWidth, 297, 'F'); // Full page height

    // Logo dimensions - make them smaller to avoid overlap
    const logoSize = 16; // Reduced to 16mm for circular logos
    const logoY = cursorY; // Position logos at the start

    // Determine image format from base64 string
    const getImageFormat = (base64String) => {
      if (base64String.includes('data:image/png')) return 'PNG';
      if (base64String.includes('data:image/jpeg') || base64String.includes('data:image/jpg')) return 'JPEG';
      if (base64String.includes('data:image/gif')) return 'GIF';
      return 'PNG';
    };

    // Calculate logo positions (left, center, right) - spread them out more
    const leftLogoX = marginX + 2;
    const centerLogoX = 105 - logoSize / 2; // Center of page
    const rightLogoX = 210 - marginX - logoSize - 2;

    // Add left logo (Barangay/City seal) if available
    if (leftLogo) {
      try {
        const format = getImageFormat(leftLogo);
        doc.addImage(leftLogo, format, leftLogoX, logoY, logoSize, logoSize);
      } catch (err) {
        console.error('Error adding left logo:', err);
      }
    }

    // Add center logo (Manila seal) if available
    if (centerLogo) {
      try {
        const format = getImageFormat(centerLogo);
        doc.addImage(centerLogo, format, centerLogoX, logoY, logoSize, logoSize);
      } catch (err) {
        console.error('Error adding center logo:', err);
      }
    }

    // Add right logo (Bagong Pilipinas) if available
    if (rightLogo) {
      try {
        const format = getImageFormat(rightLogo);
        doc.addImage(rightLogo, format, rightLogoX, logoY, logoSize, logoSize);
      } catch (err) {
        console.error('Error adding right logo:', err);
      }
    }

    // Position header text BELOW the logos to avoid overlap
    cursorY = logoY + logoSize + 6; // Start text after logos with spacing

    // Header text (centered)
    doc.setFont('Times', 'Normal');
    doc.setFontSize(9);
    doc.text('Republic of the Philippines', 105, cursorY, { align: 'center' });
    cursorY += 4;
    doc.text('City of ' + municipality, 105, cursorY, { align: 'center' });
    cursorY += 4;
    doc.setFont('Times', 'Bold');
    doc.setFontSize(10);
    doc.text('OFFICE OF THE BARANGAY CHAIRMAN', 105, cursorY, { align: 'center' });

    cursorY += 8;
    // Thick horizontal line - positioned well below logos and text
    doc.setLineWidth(1);
    doc.setDrawColor(0, 0, 0);
    doc.line(marginX, cursorY, 210 - marginX, cursorY);
    cursorY += 10;

    // Title (centered, large bold sans-serif)
    const certTitle =
      CERTIFICATE_TYPES.find((c) => c.value === certType)?.label ||
      'CERTIFICATE';
    doc.setFontSize(18);
    doc.setFont('Helvetica', 'Bold');
    doc.text(certTitle.toUpperCase(), 105, cursorY, { align: 'center' });

    cursorY += 12;
    doc.setFontSize(11);
    doc.setFont('Times', 'Normal');

    // Body text (serif font, left-aligned with indentation)
    // Remove markdown formatting from body text for PDF
    let bodyText = certificateBody.replace(/\*\*/g, '').replace(/\*/g, '');
    const bodyLines = doc.splitTextToSize(bodyText, contentWidth - 8);
    doc.text(bodyLines, marginX + 3, cursorY);
    cursorY += bodyLines.length * 5.5 + 10;

    // Date & place
    const issueDateObj = new Date(issueDate);
    const day = issueDateObj.getDate();
    const daySuffix = day === 1 || day === 21 || day === 31 ? 'st' :
                     day === 2 || day === 22 ? 'nd' :
                     day === 3 || day === 23 ? 'rd' : 'th';
    const issueText = `Issued this ${day}${daySuffix} day of ${issueDateObj.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} at ${barangayName}, ${municipality}, ${province}, Philippines.`;
    const issueLines = doc.splitTextToSize(issueText, contentWidth - 8);
    doc.text(issueLines, marginX + 3, cursorY);
    cursorY += issueLines.length * 5.5 + 18;

    // Signatory (right-aligned)
    const signY = cursorY;
    doc.setFont('Times', 'Bold');
    doc.text(captainName.toUpperCase(), rightMargin, signY, {
      align: 'right',
    });
    cursorY += 5;
    doc.setFont('Times', 'Normal');
    doc.text('Punong Barangay', rightMargin, cursorY, {
      align: 'right',
    });
    cursorY += 20;

    // Officials footer section
    const footerY = 250; // Position near bottom
    cursorY = footerY;
    
    // Get officials
    const kagawads = officials
      .filter(o => o.position === 'Kagawad')
      .sort((a, b) => (a.order_no || 0) - (b.order_no || 0))
      .map(o => o.full_name.toUpperCase());
    
    const secretary = officials.find(o => o.position === 'Secretary' || o.is_secretary);
    const treasurer = officials.find(o => o.position === 'Treasurer');

    doc.setFontSize(9);
    doc.setTextColor(139, 69, 19); // Brownish-red color
    
    // KAGAWAD section
    if (kagawads.length > 0) {
      doc.setFont('Times', 'Bold');
      doc.text('KAGAWAD:', marginX + 3, cursorY);
      cursorY += 5;
      doc.setFont('Times', 'Normal');
      const kagawadText = kagawads.join(' ♦ ');
      const kagawadLines = doc.splitTextToSize(kagawadText, contentWidth - 8);
      doc.text(kagawadLines, marginX + 3, cursorY);
      cursorY += kagawadLines.length * 4 + 3;
    }

    // SECRETARY
    if (secretary) {
      doc.setFont('Times', 'Bold');
      doc.text('SECRETARY:', marginX + 3, cursorY);
      cursorY += 5;
      doc.setFont('Times', 'Normal');
      doc.text(secretary.full_name.toUpperCase(), marginX + 3, cursorY);
      cursorY += 5;
    }

    // TREASURER
    if (treasurer) {
      doc.setFont('Times', 'Bold');
      doc.text('TREASURER:', marginX + 3, cursorY);
      cursorY += 5;
      doc.setFont('Times', 'Normal');
      doc.text(treasurer.full_name.toUpperCase(), marginX + 3, cursorY);
      cursorY += 8;
    }

    // Reset text color to black
    doc.setTextColor(0, 0, 0);

    // Disclaimer at bottom
    doc.setFont('Times', 'Italic');
    doc.setFontSize(8);
    doc.text('*NOT VALID WITHOUT BARANGAY SEAL*', 105, 290, { align: 'center' });

    const fileName = `certificate_${certType}_${buildFullName(
      selectedResident
    )
      .replace(/\s+/g, '_')
      .toLowerCase()}.pdf`;

    doc.save(fileName);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Barangay Certificates
      </Typography>

      <Grid container spacing={2}>
        {/* Left side: form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              Resident & Certificate Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  label="Resident"
                  value={selectedResidentId}
                  onChange={(e) => setSelectedResidentId(e.target.value)}
                  fullWidth
                  required
                >
                  {residents.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.last_name}, {r.first_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  select
                  label="Certificate Type"
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  fullWidth
                >
                  {CERTIFICATE_TYPES.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Purpose"
                  placeholder="e.g., employment, scholarship, school requirement"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Issue Date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Place of Issuance"
                  value={placeIssued}
                  onChange={(e) => setPlaceIssued(e.target.value)}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="OR Number"
                  value={orNumber}
                  onChange={(e) => setOrNumber(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Amount (₱)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 2 }} elevation={2}>
            <Typography variant="h6" gutterBottom>
              Barangay Header & Officials
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Barangay Name"
                  value={barangayName}
                  onChange={(e) => setBarangayName(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Municipality / City"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Punong Barangay"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Barangay Secretary"
                  value={secretaryName}
                  onChange={(e) => setSecretaryName(e.target.value)}
                  fullWidth
                />
              </Grid>

              {/* Logo Upload Fields */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Certificate Logos
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Left Logo (Barangay/City Seal)
                  </Typography>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLeftLogoChange}
                    sx={{ mb: 1 }}
                  />
                  {leftLogo && (
                    <Box
                      component="img"
                      src={leftLogo}
                      alt="Left Logo Preview"
                      sx={{
                        maxWidth: 100,
                        maxHeight: 100,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        p: 0.5,
                      }}
                    />
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Center Logo (Manila Seal)
                  </Typography>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleCenterLogoChange}
                    sx={{ mb: 1 }}
                  />
                  {centerLogo && (
                    <Box
                      component="img"
                      src={centerLogo}
                      alt="Center Logo Preview"
                      sx={{
                        maxWidth: 100,
                        maxHeight: 100,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        p: 0.5,
                      }}
                    />
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Right Logo (Bagong Pilipinas)
                  </Typography>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleRightLogoChange}
                    sx={{ mb: 1 }}
                  />
                  {rightLogo && (
                    <Box
                      component="img"
                      src={rightLogo}
                      alt="Right Logo Preview"
                      sx={{
                        maxWidth: 100,
                        maxHeight: 100,
                        border: '1px solid #ccc',
                        borderRadius: 1,
                        p: 0.5,
                      }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={handleGeneratePdf}>
              Generate PDF
            </Button>
          </Box>
        </Grid>

        {/* Right side: preview */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 0, 
              minHeight: 400,
              position: 'relative',
              overflow: 'hidden',
            }} 
            elevation={2}
          >
            {/* Yellow left border */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '15%',
                backgroundColor: '#FFEB3B',
              }}
            />

            {/* Content area */}
            <Box sx={{ pl: '18%', pr: 2, py: 3 }}>
              {/* Header with logos */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                {/* Left Logo */}
                <Box sx={{ width: 50, height: 50 }}>
                  {leftLogo ? (
                    <Box
                      component="img"
                      src={leftLogo}
                      alt="Barangay Seal"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        border: '1px dashed #ccc',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px',
                        color: '#999',
                        textAlign: 'center',
                      }}
                    >
                      Logo
                    </Box>
                  )}
                </Box>

                {/* Center Logo */}
                <Box sx={{ width: 50, height: 50 }}>
                  {centerLogo ? (
                    <Box
                      component="img"
                      src={centerLogo}
                      alt="Manila Seal"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        border: '1px dashed #ccc',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px',
                        color: '#999',
                        textAlign: 'center',
                      }}
                    >
                      Logo
                    </Box>
                  )}
                </Box>

                {/* Right Logo */}
                <Box sx={{ width: 50, height: 50 }}>
                  {rightLogo ? (
                    <Box
                      component="img"
                      src={rightLogo}
                      alt="Bagong Pilipinas"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        border: '1px dashed #ccc',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px',
                        color: '#999',
                        textAlign: 'center',
                      }}
                    >
                      Logo
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Center Text */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.75rem', mb: 0.5 }}
                >
                  Republic of the Philippines
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontSize: '0.75rem', mb: 0.5 }}
                >
                  City of {municipality}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Office of the Barangay Chairman
                </Typography>
              </Box>

              {/* Thick horizontal line */}
              <Box
                sx={{
                  height: '2px',
                  backgroundColor: '#000',
                  mb: 2,
                }}
              />

              {/* Title */}
              <Typography
                variant="h5"
                align="center"
                sx={{ 
                  textTransform: 'uppercase', 
                  mb: 3,
                  fontWeight: 700,
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {
                  CERTIFICATE_TYPES.find((c) => c.value === certType)?.label ??
                  'Certificate'
                }
              </Typography>

              {/* Body text */}
              <Typography 
                variant="body2" 
                sx={{ 
                  textAlign: 'left', 
                  mb: 2,
                  pl: 1,
                  fontFamily: 'Times, serif',
                  lineHeight: 1.6,
                }}
              >
                {selectedResident ? (
                  certificateBody.replace(/\*\*/g, '').replace(/\*/g, '')
                ) : (
                  <em>
                    Select a resident and fill in the details on the left to
                    preview the certificate text here.
                  </em>
                )}
              </Typography>

              {/* Date & place */}
              <Typography variant="body2" sx={{ mb: 3, pl: 1, fontFamily: 'Times, serif' }}>
                Issued this{' '}
                {(() => {
                  const date = new Date(issueDate);
                  const day = date.getDate();
                  const daySuffix = day === 1 || day === 21 || day === 31 ? 'st' :
                                   day === 2 || day === 22 ? 'nd' :
                                   day === 3 || day === 23 ? 'rd' : 'th';
                  return `${day}${daySuffix} day of ${date.toLocaleDateString('en-PH', {
                    month: 'long',
                    year: 'numeric',
                  })}`;
                })()}{' '}
                at {barangayName}, {municipality}, {province}, Philippines.
              </Typography>

              {/* Signatory */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  mb: 4,
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontFamily: 'Times, serif',
                  }}
                >
                  {captainName}
                </Typography>
                <Typography 
                  variant="body2"
                  sx={{ fontFamily: 'Times, serif' }}
                >
                  Punong Barangay
                </Typography>
              </Box>

              {/* Officials footer */}
              <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid #eee' }}>
                {(() => {
                  const kagawads = officials
                    .filter(o => o.position === 'Kagawad')
                    .sort((a, b) => (a.order_no || 0) - (b.order_no || 0))
                    .map(o => o.full_name.toUpperCase());
                  const secretary = officials.find(o => o.position === 'Secretary' || o.is_secretary);
                  const treasurer = officials.find(o => o.position === 'Treasurer');

                  return (
                    <>
                      {kagawads.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 700,
                              color: '#8B4513',
                              fontFamily: 'Times, serif',
                            }}
                          >
                            KAGAWAD:{' '}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#8B4513',
                              fontFamily: 'Times, serif',
                            }}
                          >
                            {kagawads.join(' ♦ ')}
                          </Typography>
                        </Box>
                      )}
                      {secretary && (
                        <Box sx={{ mb: 1 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 700,
                              color: '#8B4513',
                              fontFamily: 'Times, serif',
                            }}
                          >
                            SECRETARY:{' '}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#8B4513',
                              fontFamily: 'Times, serif',
                            }}
                          >
                            {secretary.full_name.toUpperCase()}
                          </Typography>
                        </Box>
                      )}
                      {treasurer && (
                        <Box sx={{ mb: 1 }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontWeight: 700,
                              color: '#8B4513',
                              fontFamily: 'Times, serif',
                            }}
                          >
                            TREASURER:{' '}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#8B4513',
                              fontFamily: 'Times, serif',
                            }}
                          >
                            {treasurer.full_name.toUpperCase()}
                          </Typography>
                        </Box>
                      )}
                      <Typography 
                        variant="caption" 
                        align="center"
                        sx={{ 
                          display: 'block',
                          mt: 2,
                          fontStyle: 'italic',
                          fontSize: '0.7rem',
                          fontFamily: 'Times, serif',
                        }}
                      >
                        *NOT VALID WITHOUT BARANGAY SEAL*
                      </Typography>
                    </>
                  );
                })()}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CertificatesPage;
