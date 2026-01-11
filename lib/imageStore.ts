// Shared image store for storing base64 images
// In production, replace with Redis, MongoDB GridFS, or S3
// Key: `${sessionId}:${imageId}`, Value: base64 image data

const imageStore = new Map<string, string>();

export function setImage(key: string, base64Data: string): void {
  imageStore.set(key, base64Data);
}

export function getImage(key: string): string | undefined {
  return imageStore.get(key);
}

export function deleteImage(key: string): boolean {
  return imageStore.delete(key);
}

export function clearSession(sessionId: string): void {
  const keysToDelete: string[] = [];
  for (const key of Array.from(imageStore.keys())) {
    if (key.startsWith(`${sessionId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => imageStore.delete(key));
}

