-- Migration: Ensure Data Consistency Between Households and Residents
-- This migration adds constraints, triggers, and indexes for data integrity

-- 1. Add unique constraint to prevent duplicate household members
ALTER TABLE `household_members`
ADD UNIQUE KEY `unique_household_resident` (`household_id`, `resident_id`);

-- 2. Add indexes for better query performance
CREATE INDEX `idx_household_members_household_id` ON `household_members` (`household_id`);
CREATE INDEX `idx_household_members_resident_id` ON `household_members` (`resident_id`);
CREATE INDEX `idx_residents_address` ON `residents` (`address`);
CREATE INDEX `idx_households_purok` ON `households` (`purok`);

-- 3. Create trigger to automatically update num_members when members are added
DELIMITER $$

CREATE TRIGGER `update_num_members_after_insert`
AFTER INSERT ON `household_members`
FOR EACH ROW
BEGIN
    UPDATE `households`
    SET `num_members` = (
        SELECT COUNT(*) 
        FROM `household_members` 
        WHERE `household_id` = NEW.household_id
    )
    WHERE `id` = NEW.household_id;
END$$

-- 4. Create trigger to automatically update num_members when members are deleted
CREATE TRIGGER `update_num_members_after_delete`
AFTER DELETE ON `household_members`
FOR EACH ROW
BEGIN
    UPDATE `households`
    SET `num_members` = (
        SELECT COUNT(*) 
        FROM `household_members` 
        WHERE `household_id` = OLD.household_id
    )
    WHERE `id` = OLD.household_id;
END$$

DELIMITER ;

-- 5. Update all existing households to have correct num_members
UPDATE `households` h
SET `num_members` = (
    SELECT COUNT(*) 
    FROM `household_members` hm 
    WHERE hm.household_id = h.id
);

-- 6. Ensure num_members is at least 1 (cannot be 0)
ALTER TABLE `households`
MODIFY COLUMN `num_members` INT(11) NOT NULL DEFAULT 1;
