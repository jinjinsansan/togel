import { personalityTypes } from "@/lib/personality/definitions";

console.log("Checking for duplicate IDs in personalityTypes...");

const ids = personalityTypes.map(t => t.id);
const uniqueIds = new Set(ids);

if (ids.length !== uniqueIds.size) {
  console.error(`DUPLICATE IDS FOUND! Total: ${ids.length}, Unique: ${uniqueIds.size}`);
  
  const counts: Record<string, number> = {};
  ids.forEach(id => {
    counts[id] = (counts[id] || 0) + 1;
  });
  
  Object.entries(counts).forEach(([id, count]) => {
    if (count > 1) {
      console.error(`- ID '${id}' appears ${count} times`);
    }
  });
  process.exit(1);
} else {
  console.log("No duplicate IDs found. All 24 IDs are unique.");
}
