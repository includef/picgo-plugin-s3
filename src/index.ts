import picgo from 'picgo'
import uploader, { IUploadResult } from './uploader'
import { formatPath } from './utils'

interface IS3UserConfig {
  accessKeyID: string
  secretAccessKey: string
  bucketName: string
  uploadPath: string
  region?: string
  endpoint?: string
  urlPrefix?: string
  pathStyleAccess?: boolean
  rejectUnauthorized?:boolean
  acl?: string
}

export = (ctx: picgo) => {
  const config = (ctx: picgo) => {
    const defaultConfig: IS3UserConfig = {
      accessKeyID: '',
      secretAccessKey: '',
      bucketName: '',
      uploadPath: '{year}/{month}/{md5}.{extName}',
      pathStyleAccess: false,
      rejectUnauthorized: true,
      acl: 'public-read'
    }
    let userConfig = ctx.getConfig<IS3UserConfig>('picBed.aws-s3')
    userConfig = { ...defaultConfig, ...(userConfig || {}) }
    return [
      {
        name: 'accessKeyID',
        type: 'input',
        default: userConfig.accessKeyID,
        required: true,
        message: 'access key id',
        alias: '应用密钥 ID'
      },
      {
        name: 'secretAccessKey',
        type: 'password',
        default: userConfig.secretAccessKey,
        required: true,
        message: 'secret access key',
        alias: '应用密钥'
      },
      {
        name: 'bucketName',
        type: 'input',
        default: userConfig.bucketName,
        required: true,
        alias: '桶'
      },
      {
        name: 'uploadPath',
        type: 'input',
        default: userConfig.uploadPath,
        required: true,
        alias: '文件路径'
      },
      {
        name: 'acl',
        type: 'input',
        default: userConfig.acl,
        message: '文件访问权限',
        required: true,
        alias: '权限'
      },
      {
        name: 'region',
        type: 'input',
        default: userConfig.region,
        required: false,
        alias: '地区'
      },
      {
        name: 'endpoint',
        type: 'input',
        default: userConfig.endpoint,
        required: false,
        alias: '自定义节点'
      },
      {
        name: 'urlPrefix',
        type: 'input',
        default: userConfig.urlPrefix,
        message: 'https://img.example.com/bucket-name/',
        required: false,
        alias: '自定义域名'
      },
      {
        name: 'pathStyleAccess',
        type: 'confirm',
        default: userConfig.pathStyleAccess || false,
        message: 'enable path-style-access or not',
        required: false,
        alias: 'PathStyleAccess'
      },
      {
        name: 'rejectUnauthorized',
        type: 'confirm',
        default: userConfig.rejectUnauthorized || true,
        message: 'enable path-style-access or not',
        required: false,
        alias: 'rejectUnauthorized'
      },
      {
        name: 'acl',
        type: 'input',
        default: userConfig.acl || 'public-read',
        message: '上传资源的访问策略',
        required: false,
        alias: 'ACL 访问控制列表'
      }
    ]
  }

  const handle = async (ctx: picgo) => {
    let userConfig: IS3UserConfig = ctx.getConfig('picBed.aws-s3')
    if (!userConfig) {
      throw new Error("Can't find amazon s3 uploader config")
    }
    if (userConfig.urlPrefix) {
      userConfig.urlPrefix = userConfig.urlPrefix.replace(/\/?$/, '')
    }

    const client = uploader.createS3Client(
      userConfig.accessKeyID,
      userConfig.secretAccessKey,
      userConfig.region,
      userConfig.endpoint,
      userConfig.pathStyleAccess,
      userConfig.rejectUnauthorized
    )

    const output = ctx.output

    const tasks = output.map((item, idx) =>
      uploader.createUploadTask(
        client,
        userConfig.bucketName,
        formatPath(item, userConfig.uploadPath),
        item,
        idx,
        userConfig.acl
      )
    )

    try {
      const results: IUploadResult[] = await Promise.all(tasks)
      for (let result of results) {
        const { index, url, imgURL } = result

        delete output[index].buffer
        delete output[index].base64Image
        output[index].url = url
        output[index].imgUrl = url

        if (userConfig.urlPrefix) {
          output[index].url = `${userConfig.urlPrefix}/${imgURL}`
          output[index].imgUrl = `${userConfig.urlPrefix}/${imgURL}`
        }
      }

      return ctx
    } catch (err) {
      ctx.log.error('上传到 Amazon S3 发生错误，请检查配置是否正确')
      ctx.log.error(err)
      ctx.emit('notification', {
        title: 'Amazon S3 上传错误',
        body: '请检查配置是否正确',
        text: ''
      })
      throw err
    }
  }

  const register = () => {
    ctx.helper.uploader.register('aws-s3', {
      handle,
      config,
      name: 'Amazon S3'
    })
  }
  return {
    register
  }
}
