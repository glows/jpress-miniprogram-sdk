import md5 from './md5.js';

const apis = {
  code2session: "/api/wechat/mp/code2session",
  decryptUserInfo: "/api/wechat/mp/decryptUserInfo",

  //user apis
  userInfo: "/api/user",
  myInfo: "/api/user/me",
  userSave: "/api/user/save",

  //article apis
  articleInfo: "/api/article",
  articleList: "/api/article/list",
  articleRelevantList: "/api/article/relevantList",
  articlePagination: "/api/article/paginate",
  articleCategoryInfo: "/api/article/category",
  articleCategories: "/api/article/categories",
  articleSave: "/api/article/save",
  tagArticleList:"/api/article/tagArticles",

  //comment
  commentPaginate:"/api/article/commentPaginate",
  postComment: "/api/article/postComment",

  //page apis
  pageInfo: "/api/page",
  pageList: "/api/page/list",

  //option apis
  optionInfo: "/api/option",

  //others
  html2wxml:"/commons/html2wxml",
  
}

const config = {
  host: "",
  app_id: "",
  app_secret: "",
  sessionId: "",
  jwt: ""
}

const init = conf => {
  config.host = conf.host;
  config.app_id = conf.app_id;
  config.app_secret = conf.app_secret;

  if(typeof(wx) != 'undefined'){
    var jwt = wx.getStorageSync("jwt");
    if(jwt){config.jwt = jwt}
  }
}


const getUrl = (api, paras) => {

  paras = Object.assign({
    appId: config.app_id,
    t: new Date().getTime()
  }, paras);

  //对数据进行签名
  var signString = sign(paras);

  //添加签名结果
  paras = Object.assign({
    sign: signString
  }, paras);

  //拼接URL地址
  var url = config.host + api + "?"
  var arr = Object.keys(paras);
  for (var i in arr) {
    url = url + (arr[i] + "=" + paras[arr[i]]) + "&";
  }

  //remove last '&'
  return url.substring(0, url.length - 1);
}

const createGetRequest = req => {
  //default is get
  return createRequest(req);
}

const createPostRequest = req => {
  return createRequest(Object.assign({ method: 'POST' }, req));
}

const createRequest = (req = {
  api,
  paras,
  method,
  header,
  data,
}) => {

 var url = getUrl(req.api,req.method == 'POST' ? {} : req.paras)
//var url = getUrl(req.paras)

  var realRequest = {
    url: url,
    method: (req.method == null ? 'GET' : req.method),
    header: Object.assign({ "Jwt": config.jwt }, req.header),
    data: req.data 
  }

  const p = new Promise((resolve, reject) => {

    function start(resolve,reject){
        var requestHandler;

            //支持微信小程序
            if(typeof(wx) != 'undefined'){
                requestHandler = wx;
            }
            //支持百度小程序
            else if(typeof(swan) != 'undefined'){
                requestHandler = swan;
            }

            requestHandler.request(Object.assign({
            success: function (res) {
            
                //注意：第一个字母大写
                if (res.header.Jwt){
                    updateJwt(res.header.Jwt);
                }
                //jpress 请求失败
                if (res.data.state && res.data.state == "fail") {
                    reject(res.data);
                } else {
                    resolve(res.data);
                }
            },
            error:function(e){
                reject({
                    code: 99,
                    message: '网络错误'
                });
            },
            fail: function (e) {
                reject({
                    code: 99,
                    message: '网络错误'
                });
            }
            }, realRequest))
    } 

    start(resolve,reject);
   
  });

  return {
    send: () => p
  }
}

/**
 * 对 obj 进行签名，返回签名内容
 * 要保证和JPress签名算法一致
 */
const sign = obj => {

  var secret = config.app_secret;

  //生成key升序数组，与JPress后台保存一致
  var arr = Object.keys(obj);
  arr.sort();

  var str = '';
  for (var i in arr) {
    var value = obj[arr[i]];
    if(value) str += arr[i] +value.toString();
  }

  return md5(str + secret);
}


const code2session = code => {

  createRequest({
    api: apis.code2session,
    paras: { code: code }
  })
  .send()
  .then(data => {
    config.sessionId = data.sessionId;
    return true;
  })
  .catch(data => {
    return false;
  })
}

const updateJwt = value => {
  config.jwt = value;
  wx.setStorage({
    key: 'jwt',
    data: value,
  })
}

const decryptUserInfo =  (data = {
  rawData, signature, encryptedData, iv
},callback) => {

 createPostRequest({
    api: apis.decryptUserInfo,
    data: Object.assign({ sessionId: config.sessionId }, data)
  })
  .send()
  .then(data => {
    updateJwt(data.token);
    if (callback) callback(true);
  })
  .catch(data => {
    if (callback) callback(false);
  })

}



///////////////////////option api start/////////////////////////////////

/**
 * 获取网站配置信息
 */
const getOption = (paras={key}) => {
  return createGetRequest({
    api: apis.optionInfo,
    paras: paras
  }).send()
}


const getAppName = () => {
  return getOption('wechat_miniprogram_name')
}

const getCopyright = () => {
  return getOption('wechat_miniprogram_copyright')
}

const getSlides = () => {
  return getOption('wechat_miniprogram_slides')
}

///////////////////////option api end/////////////////////////////////

///////////////////////user api start/////////////////////////////////

/**
 * 获取用户信息
 */
const getUser = (paras={id}) => {
  return createGetRequest({
    api: apis.userInfo,
    paras: paras
  }).send()
}

/**
 * 获取登录用户信息（我的信息）
 */
const getMyInfo = () => {
  return createGetRequest({
    api: apis.myInfo
  }).send()
}

/**
 * 用户信息保存
 */
const doUserSave = userData => {
  return createPostRequest({
    api: apis.userSave,
    data: userData,
  }).send()
}


///////////////////////user api end/////////////////////////////////


///////////////////////article api start/////////////////////////////////

/**
 * 获取文章信息
 */
const getArticle = (paras={id}) => {
  return createGetRequest({
    api: apis.articleInfo,
    paras: paras
  }).send()
}

/**
 * 获取文章列表
 */
const getArticleList = (paras = {
  flag,
  hasThumbnail,
  orderBy,
  count
}) => {
  return createGetRequest({
    api: apis.articleList,
    paras: paras
  }).send()
}


/**
 * 获取文章的相关文章
 */
const getArticleRelevantList = (paras = {articleId,count}) => {
  return createGetRequest({
    api: apis.articleRelevantList,
    paras: paras
  }).send()
}


/**
 * 分页获取文章内容
 */
const getArticlePage = (paras = {
  categoryId,
  orderBy,
  pageNumber,
}) => {
  return createGetRequest({
    api: apis.articlePagination,
    paras: paras
  }).send()
}

/**
 * 获取文章分类信息
 */
const getArticleCategory = (paras = {
  id,
  slug,
  type,
}) => {
  return createGetRequest({
    api: apis.articleCategoryInfo,
    paras: paras
  }).send()
}

/**
 * 获取文章分类信息
 */
const getArticleCategories = (paras={
    type,
    pid
}) => {
  return createGetRequest({
    api: apis.articleCategories,
    paras: paras
  }).send()
}


const getTagArticleList = (paras = {
  tag,
  count,
}) => {
  return createGetRequest({
    api: apis.tagArticleList,
    paras: paras
  }).send()
}



/**
 * 保存文章
 */
const doArticleSave = articleData => {
  return createPostRequest({
    api: apis.articleSave,
    data: articleData,
  }).send()
}


const getCommentPage = (paras = {
  articleId,
  page
}) => {
  return createGetRequest({
    api: apis.commentPaginate,
    paras: paras
  }).send()
}

/**
 * 发布评论
 */
const doPostComment = (paras = {
  articleId,
  pid
},content) => {
  return createPostRequest({
    api: apis.postComment,
    paras: paras,
    data: content,
  }).send()
}

///////////////////////article api end/////////////////////////////////


///////////////////////page api start/////////////////////////////////

/**
 * 获取页面信息
 */
const getPage = (paras = {
    id,
    slug,
}) => {
  return createGetRequest({
    api: apis.pageInfo,
    paras: paras
  }).send()
}

/**
 * 获取页面列表
 */
const getPageList = (paras={
    flag:flag
}) => {
  return createGetRequest({
    api: apis.pageList,
    paras: paras
  }).send()
}

///////////////////////page api end/////////////////////////////////


const isLogined = () => {
  return config.jwt != "";
}




const html2wxml = data => {
  return createPostRequest({
    api: apis.html2wxml,
    header: {
        'content-type': 'application/x-www-form-urlencoded'
    },
    data:data
  }).send()
}

const processImageSrcs = (paras={
    data,
    attrs
}) => {

  if(! paras.data ){
      return paras.data;
  }

  const attrs = paras.attrs ? paras.attrs.split(',') : null;

  if(paras.data instanceof Array){
    for (const index in paras.data) {
       const val = processObjImageSrcs(paras.data[index],attrs);
       if(val) paras.data[index] = val;
    }
  }
  //非数组的情况：object
  else{
     const val =  processObjImageSrcs(paras.data,attrs);
     if(val) paras.data = val;
  } 

  return paras.data;
}

const processObjImageSrcs = (obj,attrs)=>{
    if(typeof(obj) === 'string'){
        if(obj.indexOf('/') == 0){
           return config.host + obj;
        }
    }else{
        const arr = Object.keys(obj);
        for(const field in arr){
            for(const f in attrs){
                if(attrs[f] === arr[field]){
                    const value = obj[arr[field]];
                    if(value && value.indexOf('/') == 0){
                        obj[attrs[f]] = config.host + value;
                    }
                }
            }
        }
    }
}




module.exports = {
  config: config,
  getUrl:getUrl,
  html2wxml:html2wxml,
  processImageSrcs:processImageSrcs,

  init: init, //初始化
  createGetRequest: createGetRequest, //构建一个Get API请求
  createPostRequest: createPostRequest, //构建一个Post API请求
  createRequest: createRequest, //构建一个API请求，默认是get请求
  wxLogin: code2session, //进行用户code初始化
  wxGetUserInfo: decryptUserInfo, //进行用户注册 或 初始化当前用户信息
  isLogined: isLogined,


  // 配置相关 //
  getOption: getOption,
  getAppName: getAppName,
  getCopyright: getCopyright,
  getSlides: getSlides,
 

  // 用户相关 //
  getUser: getUser,
  getMyInfo: getMyInfo,
  doUserSave: doUserSave,

  // 文章相关 //
  getArticle: getArticle,
  getArticleList: getArticleList,
  getArticleRelevantList:getArticleRelevantList,
  getArticlePage: getArticlePage,
  getArticleCategory: getArticleCategory,
  getArticleCategories: getArticleCategories,
  getTagArticleList:getTagArticleList,
  doArticleSave: doArticleSave,
  doPostComment: doPostComment,
  getCommentPage: getCommentPage,

  // 页面相关 //
  getPage: getPage,
  getPageList: getPageList,
}
