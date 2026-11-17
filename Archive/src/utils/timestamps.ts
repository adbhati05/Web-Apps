// Every createdAt/updatedAt/editedAt/lastRead is written with serverTimestamp(), so Firestore stores it as a Timestamp set by the server's clock (the rules only accept that, see isNow in rules/firestore.rules).
// The rest of the app works with ISO strings (see src/types.ts), so services read docs through docData below, which swaps each Timestamp back into an ISO string. Components never see a Timestamp.
import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';

// Walks a value and swaps every Timestamp for its ISO string, including ones nested in maps (a chat's lastMessage and lastRead) and lists.
// Only plain objects are walked into, so nothing else Firestore can return gets taken apart by mistake.
function convertTimestamps(value: unknown): unknown {
    if (value instanceof Timestamp) return value.toDate().toISOString();
    if (Array.isArray(value)) return value.map(convertTimestamps);
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, convertTimestamps(item)]));
    }
    return value;
}

// Reads a doc's data with its Timestamps as ISO strings.
// 'estimate' fills in a just-written serverTimestamp() with the local time until the server confirms it, otherwise a message you just sent would have no time for a moment.
export function docData(snapshot: DocumentSnapshot): DocumentData {
    return convertTimestamps(snapshot.data({ serverTimestamps: 'estimate' })) as DocumentData;
}
