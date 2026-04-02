import { randomUUID } from "node:crypto"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { task } from "@trigger.dev/sdk"
import sharp from "sharp"

export type UploadInputImagesToR2Payload = {
  inputImagesDataUrls: string[]
  maxWidth?: number
  maxHeight?: number
  outputFormat?: "jpg" | "png" | "webp"
  outputQuality?: number
}

export type UploadInputImagesToR2Result = {
  inputImages: string[]
  inputImageObjectKeys: string[]
}

export const UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID = "upload-input-images-to-r2"

const DEFAULT_MAX_WIDTH = 1536
const DEFAULT_MAX_HEIGHT = 1536
const DEFAULT_OUTPUT_QUALITY = 82

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value
}

function toBufferFromDataUrl(value: string): Buffer {
  if (value.startsWith("data:")) {
    const [, data] = value.split(",", 2)
    if (!data) {
      throw new Error("Invalid data URL payload")
    }
    return Buffer.from(data, "base64")
  }

  return Buffer.from(value, "base64")
}

function getOutputFormat(
  value: UploadInputImagesToR2Payload["outputFormat"]
): "jpg" | "png" | "webp" {
  if (value === "jpg" || value === "png" || value === "webp") {
    return value
  }
  return "webp"
}

function getContentType(format: "jpg" | "png" | "webp"): string {
  if (format === "jpg") return "image/jpeg"
  if (format === "png") return "image/png"
  return "image/webp"
}

function normalizePublicBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export const uploadInputImagesToR2Task = task({
  id: UPLOAD_INPUT_IMAGES_TO_R2_TASK_ID,
  run: async (payload: UploadInputImagesToR2Payload): Promise<UploadInputImagesToR2Result> => {
    if (!Array.isArray(payload.inputImagesDataUrls) || payload.inputImagesDataUrls.length === 0) {
      throw new Error("At least one uploaded image is required")
    }

    const accountId = requireEnv("R2_ACCOUNT_ID")
    const bucket = requireEnv("R2_BUCKET")
    const accessKeyId = requireEnv("R2_ACCESS_KEY_ID")
    const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY")
    const publicBaseUrl = normalizePublicBaseUrl(requireEnv("R2_PUBLIC_BASE_URL"))

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const format = getOutputFormat(payload.outputFormat)
    const contentType = getContentType(format)
    const quality = Math.min(Math.max(payload.outputQuality ?? DEFAULT_OUTPUT_QUALITY, 1), 100)
    const maxWidth = Math.min(Math.max(payload.maxWidth ?? DEFAULT_MAX_WIDTH, 256), 4096)
    const maxHeight = Math.min(Math.max(payload.maxHeight ?? DEFAULT_MAX_HEIGHT, 256), 4096)

    const uploadedUrls: string[] = []
    const uploadedKeys: string[] = []

    for (let index = 0; index < payload.inputImagesDataUrls.length; index++) {
      const rawImage = toBufferFromDataUrl(payload.inputImagesDataUrls[index] ?? "")
      const image = sharp(rawImage)
        .rotate()
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: "inside",
          withoutEnlargement: true,
        })

      const optimizedImage =
        format === "jpg"
          ? await image.jpeg({ quality, mozjpeg: true }).toBuffer()
          : format === "png"
            ? await image.png({ quality }).toBuffer()
            : await image.webp({ quality }).toBuffer()

      const key = `input-images/${Date.now()}-${randomUUID()}-${index + 1}.${format}`

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: optimizedImage,
          ContentType: contentType,
        })
      )

      uploadedKeys.push(key)
      uploadedUrls.push(`${publicBaseUrl}/${key}`)
    }

    return {
      inputImages: uploadedUrls,
      inputImageObjectKeys: uploadedKeys,
    }
  },
})
