import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImageLibraryOptions,
  type CameraOptions,
} from 'react-native-image-picker';

const PICKER_OPTIONS: ImageLibraryOptions & CameraOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  includeBase64: false,
};

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function assetFromResult(result: Awaited<ReturnType<typeof launchImageLibrary>>): Asset | null {
  if (result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(result.errorMessage || result.errorCode);
  }
  return result.assets?.[0] ?? null;
}

export async function pickImageFromLibrary(): Promise<Asset | null> {
  const result = await launchImageLibrary(PICKER_OPTIONS);
  return assetFromResult(result);
}

/** 模拟器可用虚拟相机；相册为空时用这个更方便。 */
export async function pickImageFromCamera(): Promise<Asset | null> {
  const ok = await ensureCameraPermission();
  if (!ok) {
    throw new Error('camera_permission_denied');
  }
  const result = await launchCamera({
    ...PICKER_OPTIONS,
    saveToPhotos: false,
    cameraType: 'back',
  });
  return assetFromResult(result);
}

type PickLabels = {
  title: string;
  library: string;
  camera: string;
  cancel: string;
};

export function showImagePickMenu(
  labels: PickLabels,
  onPicked: (asset: Asset) => void,
  onEmpty: () => void,
  onError: (message: string) => void,
): void {
  Alert.alert(labels.title, undefined, [
    {
      text: labels.library,
      onPress: () => {
        pickImageFromLibrary()
          .then((asset) => {
            if (asset?.uri) onPicked(asset);
            else onEmpty();
          })
          .catch((e) => onError(e?.message || 'pick_failed'));
      },
    },
    {
      text: labels.camera,
      onPress: () => {
        pickImageFromCamera()
          .then((asset) => {
            if (asset?.uri) onPicked(asset);
            else onEmpty();
          })
          .catch((e) => {
            if (e?.message === 'camera_permission_denied') {
              onError('camera_permission_denied');
            } else {
              onError(e?.message || 'camera_failed');
            }
          });
      },
    },
    { text: labels.cancel, style: 'cancel' },
  ]);
}

export function normalizeUploadFile(asset: Asset) {
  const uri = asset.uri!;
  const type = asset.type || 'image/jpeg';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const name = asset.fileName || `chat_${Date.now()}.${ext}`;
  return { uri, type, name };
}
