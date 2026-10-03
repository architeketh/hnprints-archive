# hnPrints Archive: Project Notes

Last updated: Saturday, October 3, 2026

## Goal

Move all artwork off the Etsy shop (etsy.com/shop/hnPrints), save it locally, and set up a process for uploading new images and art to a new hosted site.

## Where things stand

Phase 1 (review site and image hosting) is finished and working. Phase 2 (upload process for new art) has not been started.

### Done

- Etsy CSV (`EtsyListingsDownload.csv`) converted to clean data: 166 listings, 668 images. No missing titles, descriptions, or prices.
- Review website built and live on GitHub Pages. It has search, sorting, a price filter, a "Possible problems" filter, and a detail view for each listing.
- All 668 images downloaded to the computer (folder: `C:\Users\mikeh\Downloads\hnprints-archive\hnprints-archive\images`).
- All images uploaded to Supabase and confirmed loading on the live site.
- Site now loads images from Supabase. If a Supabase image ever fails, it falls back to the original Etsy-hosted copy.

### Links and names

| Item | Value |
|---|---|
| Live review site | https://architeketh.github.io/hnprints-archive/ |
| GitHub repository | https://github.com/architeketh/hnprints-archive |
| Supabase project name | hnprints |
| Supabase Project URL | https://rtkwtsxehmyhdgyuyzwt.supabase.co |
| Supabase storage bucket | `artwork` (public) |
| Example image URL | https://rtkwtsxehmyhdgyuyzwt.supabase.co/storage/v1/object/public/artwork/001-1.jpg |
| Supabase storage page | https://supabase.com/dashboard/project/rtkwtsxehmyhdgyuyzwt/storage/buckets |

Image files are named by listing number and photo number, for example `001-1.jpg`, `001-2.jpg`, `002-1.jpg`.

### Files in the GitHub repository (top level)

- `index.html`: the review website
- `listings.js`: all listing data, including each image's Supabase link
- `categories.js`: your categories and which pieces belong to each (new, Oct 3)
- `data/`: folder (the `listings.json` file did not end up in the right place on GitHub, which is why the site uses `listings.js` instead)
- `download_images.py`: saves images from Etsy to the computer
- `README.md`: beginner instructions

### How to update the site today (manual)

On the repository main page: **Add file**, then **Upload files**, drag in the changed files, then **Commit changes**. Wait about a minute, then refresh with Shift held down.

## Categories (added October 3)

The home page now shows one image tile per category, plus "All listings" and "Uncategorized". Clicking a tile opens that category's pieces.

### How to create categories and assign pieces

1. Open the site with `?edit` at the end of the address: https://architeketh.github.io/hnprints-archive/?edit
   Visitors who don't use that address see no editing tools, and nothing they do can change the site.
2. On the home page, type a name and click **Create category**.
3. Click **All listings**. Use the search box to narrow the list (for example `jazz`), click **Select all shown**, choose the category from the dropdown, and click **Add selected to category**. You can also tick individual pieces. A piece can be in more than one category.
4. To assign a single piece, click it and tick its categories in the pop-up.
5. Back on the home page, **Choose cover** on a tile picks the image that represents that category. **Rename** and **Delete** are there too. Deleting a category never deletes pieces.
6. Your work is saved only in your browser until you publish it: click **Download categories.js**, then upload that file to the top level of the GitHub repository (**Add file**, **Upload files**, **Commit changes**). Wait a minute and refresh.
7. After the upload, open the `?edit` address once and click **Discard draft** if it appears.

Tip: use the same computer and browser while you work, because the unsaved draft lives in that browser. Download `categories.js` before you finish for the day.

Suggested starting categories based on your tags and titles: Jazz (about 13 pieces), Chicago (about 32), Op Art / Optical Illusion, Landscapes, Abstract / Geometric / Minimal.

## Next steps

### 1. Review for accuracy (you)

Click through the listings on the live site and compare against Etsy. Use the **Possible problems** filter first. Write down any corrections (listing number, field, correct value). I can apply them to the data.

### 2. Upload process for new art (next session)

Proposed design:

1. A private admin page where you sign in and add a new piece (title, description, price, tags, materials, photos).
2. Photos upload directly to the `artwork` bucket in Supabase.
3. Listing details are saved in a Supabase table. The existing 166 listings get loaded into it. The public site reads from that table, so new art appears without uploading files to GitHub.

Supabase setup this will need (I will give click-by-click steps):

- Create a listings table and load the 166 existing listings.
- Turn on sign-in for just you.
- Set permissions so the public can read listings but only you can add, edit, or delete.
- Copy the project's public (anon) key into the site. This key is meant to be public. Never share the `service_role` key or the database password.

### 3. Open question for tomorrow

Should the admin page also allow editing and deleting existing listings, or only adding new ones? Recommended: allow editing too, so corrections from the review can be fixed in the page instead of in files.

### 4. Later (not urgent)

- Decide the final home and domain for the new hosted site.
- Decide what to do with the Etsy shop and keep the Etsy-hosted image fallback in mind until the shop is closed.
- Check storage size. The Supabase free plan has about 1 GB of file storage. Check usage under Storage or Project Settings, and confirm the current limit on Supabase's pricing page. If space gets tight, images can be shrunk.
- Back up `listings.js`, the `images` folder, and the original CSV somewhere safe (external drive or cloud folder).

## Things to bring to the next session

- Any accuracy corrections from your review.
- Your answer to the edit and delete question above.
- Whether the live site is still showing images from Supabase.

## Reminders

- Do not share keys or passwords in chat. The Project URL and bucket name are safe to share.
- "Connect" buttons in Supabase and a GitHub link inside Supabase are not needed for the current setup.
