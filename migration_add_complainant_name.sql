-- Migration script to add complainant_name field to incidents table
-- Run this script to update your existing database

ALTER TABLE `incidents`
  ADD COLUMN `complainant_name` varchar(255) DEFAULT NULL AFTER `complainant_id`;
