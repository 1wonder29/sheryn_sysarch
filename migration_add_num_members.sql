    -- Migration: Add num_members column to households table
    -- This stores the number of household members as input by residents

    ALTER TABLE `households` 
    ADD COLUMN `num_members` INT(11) DEFAULT 1 AFTER `purok`;

    -- Update existing households with the actual count of members
    UPDATE `households` h
    SET `num_members` = (
        SELECT COUNT(*) 
        FROM `household_members` hm 
        WHERE hm.household_id = h.id
    );
