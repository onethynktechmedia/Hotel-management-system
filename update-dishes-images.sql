-- =========================================================
-- 1. REMOVE DUPLICATE DISHES
--    Keeps the oldest record for each dish name
-- =========================================================

WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(name))
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM dishes
)
DELETE FROM dishes
WHERE id IN (
    SELECT id
    FROM duplicates
    WHERE rn > 1
);


-- =========================================================
-- 2. INSERT MISSING DISHES
-- =========================================================

INSERT INTO dishes (name, description, price, category, image_url)
SELECT *
FROM (
    VALUES
        (
            'Butter Chicken',
            'Tender chicken cooked in a rich tomato and butter gravy',
            280.00,
            'Main Course',
            'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Paneer Tikka',
            'Grilled Indian cottage cheese marinated with spices',
            220.00,
            'Starters',
            'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Dal Makhani',
            'Slow-cooked black lentils with butter and cream',
            180.00,
            'Main Course',
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Naan',
            'Soft Indian flatbread cooked in a tandoor',
            40.00,
            'Bread',
            'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Biryani',
            'Fragrant basmati rice cooked with aromatic spices',
            250.00,
            'Main Course',
            'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Samosa',
            'Crispy pastry filled with spiced potatoes and peas',
            50.00,
            'Starters',
            'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Chicken Tikka',
            'Char-grilled marinated chicken pieces',
            240.00,
            'Starters',
            'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Vegetable Pulao',
            'Basmati rice cooked with seasonal vegetables and spices',
            160.00,
            'Main Course',
            'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Roti',
            'Traditional whole wheat Indian flatbread',
            15.00,
            'Bread',
            'https://images.unsplash.com/photo-1628294895950-9805252327bc?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Water Bottle',
            'Mineral water 500ml',
            20.00,
            'Beverage',
            'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Aloo Tikki',
            'Crispy spiced potato patties',
            70.00,
            'Starters',
            'https://images.unsplash.com/photo-1606491956689-2ea6290a7e46?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Hara Bhara Kabab',
            'Spinach, peas and potato vegetarian kebabs',
            85.00,
            'Starters',
            'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Kheer',
            'Creamy rice pudding flavored with cardamom, nuts and saffron',
            100.00,
            'Desserts',
            'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Rasgulla',
            'Soft cottage cheese balls soaked in light sugar syrup',
            90.00,
            'Desserts',
            'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Gulab Jamun',
            'Soft milk-solid dumplings soaked in warm sugar syrup',
            90.00,
            'Desserts',
            '/gulabjamun.png'
        ),
        (
            'Raita',
            'Refreshing yogurt side dish with vegetables and spices',
            60.00,
            'Sides',
            'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Papad',
            'Crispy thin lentil wafers served as a side',
            20.00,
            'Sides',
            'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Fresh Lime Soda',
            'Refreshing lime soda with fresh lime and mint',
            45.00,
            'Beverage',
            'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Masala Chai',
            'Traditional Indian tea brewed with aromatic spices',
            25.00,
            'Beverage',
            'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=400&fit=crop&q=80'
        ),
        (
            'Jeera Rice',
            'Fragrant basmati rice tempered with cumin seeds',
            80.00,
            'Main Course',
            'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=600&h=400&fit=crop&q=80'
        )
) AS new_dishes (
    name,
    description,
    price,
    category,
    image_url
)
WHERE NOT EXISTS (
    SELECT 1
    FROM dishes d
    WHERE LOWER(TRIM(d.name)) = LOWER(TRIM(new_dishes.name))
);


-- =========================================================
-- 3. UPDATE IMAGE URLS FOR ALL DISHES
-- =========================================================

UPDATE dishes
SET image_url = CASE LOWER(TRIM(name))

    WHEN 'butter chicken'
        THEN 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=400&fit=crop&q=80'

    WHEN 'paneer tikka'
        THEN 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=400&fit=crop&q=80'

    WHEN 'dal makhani'
        THEN 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop&q=80'

    WHEN 'naan'
        THEN 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop&q=80'

    WHEN 'roti'
        THEN 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop&q=80'

    WHEN 'biryani'
        THEN 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=400&fit=crop&q=80'

    WHEN 'samosa'
        THEN 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=400&fit=crop&q=80'

    WHEN 'chicken tikka'
        THEN 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=400&fit=crop&q=80'

    WHEN 'vegetable pulao'
        THEN 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop&q=80'

    WHEN 'water bottle'
        THEN 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop&q=80'

    WHEN 'aloo tikki'
        THEN 'https://images.unsplash.com/photo-1606491956689-2ea6290a7e46?w=600&h=400&fit=crop&q=80'

    WHEN 'hara bhara kabab'
        THEN 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=400&fit=crop&q=80'

    WHEN 'kheer'
        THEN 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&h=400&fit=crop&q=80'

    WHEN 'rasgulla'
        THEN 'https://images.unsplash.com/photo-1626132647523-66f6bf2c8a3e?w=600&h=400&fit=crop&q=80'

    WHEN 'gulab jamun'
        THEN '/gulabjamun.png'

    WHEN 'raita'
        THEN 'https://images.unsplash.com/photo-1604999333679-b86d54738315?w=600&h=400&fit=crop&q=80'

    WHEN 'papad'
        THEN 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&h=400&fit=crop&q=80'

    WHEN 'fresh lime soda'
        THEN 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=400&fit=crop&q=80'

    WHEN 'masala chai'
        THEN 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=400&fit=crop&q=80'

    WHEN 'jeera rice'
        THEN 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=600&h=400&fit=crop&q=80'

    ELSE image_url

END;


-- =========================================================
-- 4. VERIFY THE FINAL DATA
-- =========================================================

SELECT
    id,
    name,
    category,
    price,
    image_url
FROM dishes
ORDER BY category, name;
