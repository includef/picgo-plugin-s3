import AWS from 'aws-sdk'
import { PutObjectRequest } from 'aws-sdk/clients/s3'
import { IImgInfo } from 'picgo/dist/src/types'
import { extractInfo } from './utils'
import https from 'https'

export interface IUploadResult {
  url: string
  imgURL: string
  index: number
}

function createS3Client(
  accessKeyID: string,
  secretAccessKey: string,
  region: string,
  endpoint: string,
  pathStyleAccess: boolean,
  rejectUnauthorized:boolean
): AWS.S3 {
  if (!rejectUnauthorized) {
    AWS.config.update({
      httpOptions: {
        agent: new https.Agent({
          rejectUnauthorized: false,
        })
      }
    });
}
  const s3 = new AWS.S3({
    region,
    endpoint,
    accessKeyId: accessKeyID,
    secretAccessKey: secretAccessKey,
    s3ForcePathStyle: pathStyleAccess
  })
  return s3
}

function createUploadTask(
  s3: AWS.S3,
  bucketName: string,
  path: string,
  item: IImgInfo,
  index: number,
  acl: string
): Promise<IUploadResult> {
  return new Promise(async (resolve, reject) => {
    if (!item.buffer && !item.base64Image) {
      reject(new Error('undefined image'))
    }

    const { body, contentType, contentEncoding } = await extractInfo(item)

    const opts: PutObjectRequest = {
      Key: path,
      Bucket: bucketName,
      ACL: acl,
      Body: body,
      ContentType: contentType,
      ContentEncoding: contentEncoding,
    }

    s3.upload(opts)
      .promise()
      .then((result) => {
        resolve({
          url: result.Location,
          imgURL: result.Key,
          index
        })
      })
      .catch((err) => reject(err))
  })
}

export default {
  createS3Client,
  createUploadTask
}
