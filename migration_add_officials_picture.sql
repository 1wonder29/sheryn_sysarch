-- Migration script to add picture_path column to officials table
-- Run this script to add support for official pictures

ALTER TABLE `officials`
  ADD COLUMN `picture_path` varchar(255) DEFAULT NULL AFTER `signature_path`;
