# Dhole Patil Khanawal - Landing Page & Menu Features

## 🎬 Landing Page Features

### Full-Screen Video Background
The landing page now features a full-screen video background similar to Zomato.

**Video Requirements:**
- Format: MP4
- Recommended size: 10-20MB
- Resolution: 1920x1080 (Full HD)
- Duration: 10-30 seconds (looping)
- Content: Food preparation, plating, or restaurant ambiance

**How to Add Video:**
1. Create or download a food video
2. Name it `food-background.mp4`
3. Place it in the `public/` directory
4. The video will automatically load on the landing page

**Video Fallback:**
- If video doesn't load, a gradient background shows
- The gradient uses brand colors (#5D3A1A, #8B4513, #A0522D)

**Dummy Video for Testing:**
If you don't have a video yet, you can:
1. Use any short food video from free stock sites (Pexels, Pixabay)
2. Download from YouTube using a video downloader
3. Record a short video of your restaurant
4. For now, the placeholder image will show if video is missing

### Landing Page Sections:
1. **Hero Section:**
   - Full-screen video background
   - Restaurant logo with gold border
   - Bilingual restaurant name (Marathi + English)
   - Tagline and description
   - "View Menu" CTA button
   - Instagram and WhatsApp links
   - Scroll indicator

2. **Menu Preview:**
   - 3 featured dishes (Chicken Handi, Mutton Thali, Chicken Biryani)
   - Star ratings
   - Prices
   - "View Full Menu" button

3. **Footer:**
   - Logo
   - Restaurant name
   - Social media links
   - Copyright

## ⭐ Star Ratings & Offers

### Database Schema Update
The `dishes` table now includes:
- `rating` (number) - Star rating (0-5)
- `offer` (text) - Offer text (e.g., "20% OFF", "Buy 1 Get 1")

### Adding Ratings & Offers via Admin Dashboard

**Option 1: Direct Database Update (Supabase)**
1. Go to Supabase Dashboard → Table Editor → dishes
2. Edit a dish
3. Add `rating` value (e.g., 4.5)
4. Add `offer` text (e.g., "10% OFF")
5. Save

**Option 2: Via API**
```bash
# Update dish with rating and offer
curl -X PATCH http://localhost:3000/api/dishes \
  -H "Content-Type: application/json" \
  -d '{
    "id": "dish-id",
    "rating": 4.5,
    "offer": "20% OFF"
  }'
```

**Option 3: Add to Admin Dashboard UI**
The admin dashboard at `/secure-dashboard-xyz789` needs to be updated to include:
- Rating input field (0-5 stars)
- Offer text input field
- Delete offer button

### Display on Menu Page
- Star ratings show automatically if `rating` field has a value
- Offer badges show automatically if `offer` field has text
- Both can be edited/deleted from admin dashboard

## 📱 Social Media Links

### Instagram Link
- Displayed on landing page
- Displayed on menu page
- Currently links to: `https://instagram.com`
- Update in: `src/app/page.tsx` and `src/app/menu/page.tsx`

### WhatsApp Link
- Displayed on landing page
- Displayed on menu page
- Currently links to: `https://wa.me/919876543210`
- Update with your actual WhatsApp number

### How to Update Social Links:
1. Open `src/app/page.tsx`
2. Find the Instagram and WhatsApp links
3. Replace with your actual URLs
4. Repeat for `src/app/menu/page.tsx`

## 🎨 Design Features

### Landing Page:
- Full-screen video background
- Glassmorphism effects
- Gold accent colors
- Animated scroll indicator
- Responsive design
- Social media buttons with hover effects

### Menu Page:
- Star ratings for each dish
- Offer badges (if available)
- Social media section
- Filter options
- Search functionality
- Bilingual support

## 📋 Next Steps

1. **Add Video:**
   - Create or download a food video
   - Save as `public/food-background.mp4`
   - Test on landing page

2. **Update Social Links:**
   - Replace Instagram URL with your actual Instagram
   - Replace WhatsApp number with your actual number

3. **Add Ratings & Offers:**
   - Via Supabase Dashboard or API
   - Add ratings to your best dishes
   - Add promotional offers

4. **Enhance Admin Dashboard (Optional):**
   - Add rating input in dish edit form
   - Add offer text input
   - Add delete offer button

## 🎯 File Locations

- Landing Page: `src/app/page.tsx`
- Menu Page: `src/app/menu/page.tsx`
- Types: `src/types/index.ts`
- Video: `public/food-background.mp4` (to be added)
- Database: Supabase Dashboard → dishes table

## 🧪 Testing

1. Test landing page without video (gradient fallback)
2. Add video and test again
3. Add ratings to dishes in Supabase
4. Verify ratings display on menu
5. Add offers to dishes
6. Verify offer badges display
7. Test social media links
8. Test responsive design on mobile

## 📊 Example Rating & Offer Data

```json
{
  "id": "dish-id",
  "name": "Chicken Handi",
  "rating": 4.5,
  "offer": "20% OFF on weekends"
}
```

This will display:
- 4.5 stars (gold filled)
- "20% OFF on weekends" badge in gold
- Both in menu cards

## 🔧 Troubleshooting

**Video not loading:**
- Check file is in `public/` directory
- Check file name is exactly `food-background.mp4`
- Check file format is MP4
- Check browser console for errors

**Ratings not showing:**
- Verify `rating` field exists in database
- Check value is between 0-5
- Refresh menu page

**Offers not showing:**
- Verify `offer` field exists in database
- Check field has text content
- Refresh menu page

**Social links not working:**
- Verify URLs are correct
- Check for typos in URLs
- Test in new browser tab
