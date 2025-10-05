/**
 * Test file to validate the folder-based playlist generation functionality
 * This demonstrates how the new feature works with sample data
 */

// Sample data structure to test the functionality
const testData = {
  baseMusicFolder: "E:\\Music",
  
  // Sample existing M3U content to simulate song counting
  existingM3UFiles: [
    {
      name: "favorites.m3u",
      content: `#EXTM3U
#EXTINF:180,Artist1 - Song1
English/song1.mp3
#EXTINF:200,Artist2 - Song2
Hindi/song2.mp3
#EXTINF:180,Artist1 - Song1  
English/song1.mp3`
    },
    {
      name: "party_mix.m3u", 
      content: `#EXTM3U
#EXTINF:200,Artist2 - Song2
Hindi/song2.mp3
#EXTINF:220,Artist3 - Song3
English/song3.mp3`
    }
  ],

  // Sample folder structure
  folderStructure: {
    "English": [
      { name: "song1.mp3", path: "E:\\Music\\English\\song1.mp3" },
      { name: "song3.mp3", path: "E:\\Music\\English\\song3.mp3" },
      { name: "song4.mp3", path: "E:\\Music\\English\\song4.mp3" }
    ],
    "Hindi": [
      { name: "song2.mp3", path: "E:\\Music\\Hindi\\song2.mp3" },
      { name: "song5.mp3", path: "E:\\Music\\Hindi\\song5.mp3" }
    ]
  }
};

/**
 * Expected results after processing:
 * 
 * Song appearance counts:
 * - English/song1.mp3: 2 appearances (in favorites.m3u twice)
 * - Hindi/song2.mp3: 2 appearances (in favorites.m3u and party_mix.m3u)
 * - English/song3.mp3: 1 appearance (in party_mix.m3u)
 * - English/song4.mp3: 0 appearances
 * - Hindi/song5.mp3: 0 appearances
 * 
 * Generated playlists:
 * 
 * English.m3u (ordered by count, descending):
 * #EXTM3U
 * #EXTINF:-1,song1.mp3 (appeared 2 times)
 * English/song1.mp3
 * #EXTINF:-1,song3.mp3 (appeared 1 times)
 * English/song3.mp3
 * #EXTINF:-1,song4.mp3 (appeared 0 times)
 * English/song4.mp3
 * 
 * Hindi.m3u (ordered by count, descending):
 * #EXTM3U
 * #EXTINF:-1,song2.mp3 (appeared 2 times)
 * Hindi/song2.mp3
 * #EXTINF:-1,song5.mp3 (appeared 0 times)
 * Hindi/song5.mp3
 */

console.log("Folder-based playlist generation test data prepared");
console.log("This feature will:");
console.log("1. Analyze existing M3U files to count song appearances");
console.log("2. Scan subfolders for MP3 files"); 
console.log("3. Create new M3U files ordered by song popularity");
console.log("4. Output: English.m3u and Hindi.m3u with songs ordered by frequency");

export default testData;