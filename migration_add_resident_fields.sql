-- Migration script to add new fields to residents table
-- Run this script to update your existing database

ALTER TABLE `residents`
  ADD COLUMN `nickname` varchar(50) DEFAULT NULL AFTER `suffix`,
  ADD COLUMN `age` int(11) DEFAULT NULL AFTER `birthdate`,
  ADD COLUMN `employment_status` enum('With work','Without work') DEFAULT NULL AFTER `civil_status`,
  ADD COLUMN `registered_voter` enum('Yes','No') DEFAULT NULL AFTER `employment_status`,
  ADD COLUMN `resident_status` enum('Resident','Transferred','Non-resident') DEFAULT 'Resident' AFTER `registered_voter`,
  ADD COLUMN `is_senior_citizen` tinyint(1) DEFAULT 0 AFTER `resident_status`,
  ADD COLUMN `is_pwd` tinyint(1) DEFAULT 0 AFTER `is_senior_citizen`;

-- Update civil_status enum if needed (if it's currently varchar, you may need to modify existing data first)
-- ALTER TABLE `residents` MODIFY COLUMN `civil_status` enum('Single','Married','Widowed') DEFAULT NULL;

-- Calculate and update ages for existing residents
UPDATE `residents`
SET `age` = TIMESTAMPDIFF(YEAR, `birthdate`, CURDATE())
WHERE `birthdate` IS NOT NULL;
