-- Migration script to update officials position names
-- Run this script to update existing officials to use the new position names:
-- Chairman, Kagawad, Secretary, Treasurer

-- Update Punong Barangay to Chairman
UPDATE `officials`
SET `position` = 'Chairman'
WHERE `position` = 'Punong Barangay';

-- Update Barangay Kagawad to Kagawad
UPDATE `officials`
SET `position` = 'Kagawad'
WHERE `position` = 'Barangay Kagawad';

-- Update Barangay Secretary to Secretary
UPDATE `officials`
SET `position` = 'Secretary'
WHERE `position` = 'Barangay Secretary';

-- Update Barangay Treasurer to Treasurer
UPDATE `officials`
SET `position` = 'Treasurer'
WHERE `position` = 'Barangay Treasurer';

-- Update is_captain flag for Chairman
UPDATE `officials`
SET `is_captain` = 1
WHERE `position` = 'Chairman';

-- Update is_secretary flag for Secretary
UPDATE `officials`
SET `is_secretary` = 1
WHERE `position` = 'Secretary';
