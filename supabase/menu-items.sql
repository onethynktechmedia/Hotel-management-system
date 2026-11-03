-- Complete Restaurant Menu for Dhole Patil Khanawal
-- This script inserts all menu items into the dishes table

-- Non-Veg Items
INSERT INTO dishes (name, marathi_name, description, marathi_description, price, category, food_type, image_url, is_available) VALUES
('Chicken Handi Half (10 Pieces)', 'चिकन हंडी हाफ (१० पिस)', 'Tender chicken pieces cooked in rich handi style gravy', 'हाताळ कोमट तुकडे हंडी पद्धतीत गोळ्यात शिजवलेले', 300, 'Non-Veg', 'nonveg', '/images/chicken-handi-half.jpg', true),
('Chicken Handi Full (20 Pieces)', 'चिकन हंडी फुल (२० पिस)', 'Tender chicken pieces cooked in rich handi style gravy', 'हाताळ कोमट तुकडे हंडी पद्धतीत गोळ्यात शिजवलेले', 560, 'Non-Veg', 'nonveg', '/images/chicken-handi-full.jpg', true),
('Chicken Thali', 'चिकन थाळी', 'Complete chicken meal with rice, roti, curry and sides', 'पूर्ण चिकन जेवण राईस, भाकरी, करी आणि साइड्ससहित', 190, 'Thali', 'nonveg', '/images/chicken-thali.jpg', true),
('Mutton Thali', 'मटण थाळी', 'Complete mutton meal with rice, roti, curry and sides', 'पूर्ण मटण जेवण राईस, भाकरी, करी आणि साइड्ससहित', 260, 'Thali', 'nonveg', '/images/mutton-thali.jpg', true),
('Egg Curry Fry', 'अंडाकरी फ्राय', 'Spicy egg curry fried to perfection', 'तीखट अंडाकरी फ्राय', 120, 'Non-Veg', 'nonveg', '/images/egg-curry-fry.jpg', true),
('Bombay Duck Curry', 'बॉम्बील भाजी', 'Traditional Bombay duck curry', 'पारंपरिक बॉम्बील भाजी', 150, 'Non-Veg', 'nonveg', '/images/bombay-duck-curry.jpg', true),
('Boiled Egg', 'बॉईल अंडे', 'Perfectly boiled eggs', 'योग्यरित्या उकळलेले अंडे', 10, 'Non-Veg', 'nonveg', '/images/boiled-egg.jpg', true),
('Omelette', 'ऑम्लेट', 'Fluffy omelette with spices', 'मसाल्यांसहित फुफ्फी ऑम्लेट', 50, 'Non-Veg', 'nonveg', '/images/omelette.jpg', true),
('Chicken Fry (6 Pieces)', 'चिकन फ्राय (६ पिस)', 'Crispy fried chicken pieces', 'क्रिस्पी फ्राय चिकन तुकडे', 130, 'Non-Veg', 'nonveg', '/images/chicken-fry.jpg', true),
('Boiled Egg Fry (2 Eggs)', 'बॉईल फ्राय (२ अंडे)', 'Fried boiled eggs with spices', 'मसाल्यांसहित फ्राय उकळलेले अंडे', 30, 'Non-Veg', 'nonveg', '/images/boiled-egg-fry.jpg', true),
('Dry Fish Plate', 'सुकट प्लेट', 'Crispy dry fish fry', 'क्रिस्पी सुकट मासे फ्राय', 90, 'Non-Veg', 'nonveg', '/images/dry-fish-plate.jpg', true),
('Chicken Biryani (1 KG)', 'चिकन बिर्याणी (१ किलो)', 'Aromatic chicken biryani with basmati rice', 'सुगंधित चिकन बिर्याणी बासमती राईससहित', 700, 'Rice & Biryani', 'nonveg', '/images/chicken-biryani.jpg', true);

-- Veg Items
INSERT INTO dishes (name, marathi_name, description, marathi_description, price, category, food_type, image_url, is_available) VALUES
('Shev Bhaji Thali', 'शेव भाजी थाळी', 'Complete vegetarian meal with shev bhaji', 'पूर्ण शाकाहारी जेवण शेव भाजीसहित', 150, 'Thali', 'veg', '/images/shev-bhaji-thali.jpg', true),
('Vangi Masala', 'वांगी मसाला', 'Spicy brinjal curry with authentic Maharashtrian spices', 'पारंपरिक महाराष्ट्रीय मसाल्यांसहित तीखट वांगी भाजी', 140, 'Veg', 'veg', '/images/vangi-masala.jpg', true),
('Paneer Masala', 'पनीर मसाला', 'Rich paneer curry with tomatoes and spices', 'टोमॅटो आणि मसाल्यांसहित गोड पनीर भाजी', 180, 'Veg', 'veg', '/images/paneer-masala.jpg', true),
('Drumstick Vegetable Curry', 'शेवगा भाजी', 'Drumstick vegetable curry', 'शेवगा भाजी', 120, 'Veg', 'veg', '/images/drumstick-curry.jpg', true),
('Pithla', 'पिठले', 'Traditional Maharashtrian besan curry', 'पारंपरिक महाराष्ट्रीय बेसन भाजी', 80, 'Veg', 'veg', '/images/pithla.jpg', true),
('Zhirak', 'झिरक', 'Traditional Maharashtrian dry vegetable', 'पारंपरिक महाराष्ट्रीय सुकट भाजी', 80, 'Veg', 'veg', '/images/zhirak.jpg', true),
('Thecha', 'ठेचा', 'Spicy green chilli chutney', 'तीखट हिरव्या मिरची ठेचा', 75, 'Veg', 'veg', '/images/thecha.jpg', true);

-- Rice Items
INSERT INTO dishes (name, marathi_name, description, marathi_description, price, category, food_type, image_url, is_available) VALUES
('Plain Rice Full', 'साधा राईस फुल', 'Steamed basmati rice full plate', 'उकळलेले बासमती राईस फुल प्लेट', 90, 'Rice & Biryani', 'veg', '/images/plain-rice-full.jpg', true),
('Plain Rice Half', 'साधा राईस हाफ', 'Steamed basmati rice half plate', 'उकळलेले बासमती राईस हाफ प्लेट', 50, 'Rice & Biryani', 'veg', '/images/plain-rice-half.jpg', true),
('Jeera Rice Full', 'जिरा राईस फुल', 'Cumin flavored basmati rice full plate', 'जिरा सुगंधित बासमती राईस फुल प्लेट', 100, 'Rice & Biryani', 'veg', '/images/jeera-rice-full.jpg', true),
('Jeera Rice Half', 'जिरा राईस हाफ', 'Cumin flavored basmati rice half plate', 'जिरा सुगंधित बासमती राईस हाफ प्लेट', 60, 'Rice & Biryani', 'veg', '/images/jeera-rice-half.jpg', true);

-- Roti & Bread Items
INSERT INTO dishes (name, marathi_name, description, marathi_description, price, category, food_type, image_url, is_available) VALUES
('Bhakri', 'भाकरी', 'Traditional Maharashtrian jowar bread', 'पारंपरिक महाराष्ट्रीय ज्वार भाकरी', 20, 'Roti & Bread', 'veg', '/images/bhakri.jpg', true),
('Chapati', 'चपाती', 'Soft wheat flour flatbread', 'मऊगहू चपाती', 15, 'Roti & Bread', 'veg', '/images/chapati.jpg', true);

-- Starters & Sides Items
INSERT INTO dishes (name, marathi_name, description, marathi_description, price, category, food_type, image_url, is_available) VALUES
('Plain Papad', 'पापड साधा', 'Crispy plain papad', 'क्रिस्पी साधा पापड', 15, 'Starters & Sides', 'veg', '/images/plain-papad.jpg', true),
('Masala Papad', 'मसाला पापड', 'Spicy masala papad', 'तीखट मसाला पापड', 30, 'Starters & Sides', 'veg', '/images/masala-papad.jpg', true);

-- Special Cooking Service Items (Rate-based)
INSERT INTO dishes (name, marathi_name, description, marathi_description, price, category, food_type, image_url, is_available, is_service) VALUES
('Chicken / Fish Preparation', 'चिकन / मासे तयार करून मिळतील', 'Cooking service for customer-provided chicken or fish - ₹300 per KG', 'ग्राहकांनी दिलेल्या चिकन किंवा मास्यासाठी शिजण सेवा - प्रति किलो ₹३००', 300, 'Special Cooking Service', 'nonveg', '/images/cooking-service.jpg', true, true),
('Mutton Preparation', 'मटण तयार करून मिळेल', 'Cooking service for customer-provided mutton - ₹350 per KG', 'ग्राहकांनी दिलेल्या मटणासाठी शिजण सेवा - प्रति किलो ₹३५०', 350, 'Special Cooking Service', 'nonveg', '/images/cooking-service.jpg', true, true),
('Half KG Preparation', 'अर्धा किलो', 'Half KG cooking service - ₹200', 'अर्धा किलो शिजण सेवा - ₹२००', 200, 'Special Cooking Service', 'nonveg', '/images/cooking-service.jpg', true, true);
