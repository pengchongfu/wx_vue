var Data;//当前状态,保存二维码,头像,联系人和消息列表等事务
var wxSession;//保存登录信息

run();

function run(){
  getUuid().then(checkState).then(login).then(init).then(getContact).then(syncCheck);
}

function request(method,url,body,callback){
  var xhr = new XMLHttpRequest();
  xhr.open(method,url,true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState === 4){
      if(xhr.status===200){
        callback(xhr.responseText);
      }
      else{
        callback(xhr.responseText,true);
      }
    }
  }
  if(body){
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(JSON.stringify(body));
  }
  else{
    xhr.send();
  }
}

function getUuid(){
  return new Promise(function(resolve,reject){
    console.log('获取二维码');
    Data={url:'',contact:[]};
    wxSession={};
    var url = "https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=en_US&_="+Date.now();
    request("GET",url,null,function(body) {
      wxSession.uuid=body.substring(50,62);
      wxSession.tip=1;
      Data.url="https://login.weixin.qq.com/qrcode/"+wxSession.uuid;
      router.go({
        path:'/'
      });
      console.log("请扫描二维码");
      resolve(wxSession);
    });
  });
}

function checkState(wxSession){
  var url='https://login.weixin.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid='+wxSession.uuid+"&tip="+wxSession.tip+"&r="+~Date.now()+"_="+Date.now();
  return new Promise(function(resolve,reject){
    request("GET",url,null,function(body){
      if(/window\.code=201/.test(body)){
        wxSession.tip=0;
        console.log("请确认登录");
        Data.url=body.split("'")[1];
        resolve(checkState(wxSession));
      }
      else if(/window\.code=200/.test(body)){
        wxSession.redirect=/window\.redirect_uri="([^"]+)";/.exec(body)[1];
        console.log("获取重定向链接");
        var e=/https?:\/\/(([a-zA-Z0-9_-])+(\.)?)*(:\d+)?/.exec(wxSession.redirect)[0];
            t="weixin.qq.com",
            o="file.wx.qq.com",
            n="webpush.weixin.qq.com";
        e.indexOf("wx2.qq.com")>-1?(t="weixin.qq.com",o="file2.wx.qq.com",n="webpush2.weixin.qq.com"):e.indexOf("qq.com")>-1?(t="weixin.qq.com",o="file.wx.qq.com",n="webpush.weixin.qq.com"):e.indexOf("web1.wechat.com")>-1?(t="wechat.com",o="file1.wechat.com",n="webpush1.wechat.com"):e.indexOf("web2.wechat.com")>-1?(t="wechat.com",o="file2.wechat.com",n="webpush2.wechat.com"):e.indexOf("wechat.com")>-1?(t="wechat.com",o="file.wechat.com",n="webpush.wechat.com"):e.indexOf("web1.wechatapp.com")>-1?(t="wechatapp.com",o="file1.wechatapp.com",n="webpush1.wechatapp.com"):(t="wechatapp.com",o="file.wechatapp.com",n="webpush.wechatapp.com");
        //以上为web微信源代码内的代码，只使用了e和t，e代表获取消息的服务器，n代表保持轮询的服务器
        wxSession.e=e;
        wxSession.t="https://"+t;
        wxSession.o="https://"+o;
        wxSession.n="https://"+n;
        resolve(wxSession);
      }
      else if(/window\.code=400/.test(body)){
        resolve(getUuid().then(checkState));
      }
      else{
        resolve(checkState(wxSession));
      }
    });
  });
}

function login(wxSession){
  return new Promise(function(resolve,reject){
    request("GET",wxSession.redirect+"&fun=new&version=v2&lang=en_US",null,
    function(body){
      wxSession.BaseRequest={
        skey:(new RegExp('<skey>([^<]+)</skey>')).exec(body)[1],
        sid:(new RegExp('<wxsid>([^<]+)</wxsid>')).exec(body)[1],
        uin:(new RegExp('<wxuin>([^<]+)</wxuin>')).exec(body)[1],
        deviceId:'e' + ('' + Math.random().toFixed(15)).substring(2, 17)
      };
      wxSession.pass_ticket=(new RegExp('<pass_ticket>([^<]+)</pass_ticket>')).exec(body)[1];
      console.log("登录成功");
      resolve(wxSession);
    });
  });
}

function init(wxSession){
  return new Promise(function(resolve,reject){
    var url=wxSession.e+"/cgi-bin/mmwebwx-bin/webwxinit?r="+~Date.now()+"&lang=en_US&pass_ticket="+wxSession.pass_ticket;
    request("POST",url,{BaseRequest:wxSession.BaseRequest},function(body){
      console.log("初始化成功");
      body=JSON.parse(body);
      wxSession.username = body['User']['UserName'];
      wxSession.nickname = body['User']['NickName'];
      wxSession.synckey = body['SyncKey'];
      resolve(wxSession);
    });
  });
}

function getContact(wxSession){
  return new Promise(function(resolve,reject){
    var url=wxSession.e+'/cgi-bin/mmwebwx-bin/webwxgetcontact?lang=en_US&pass_ticket='+wxSession.pass_ticket+'&skey='+wxSession.BaseRequest.skey+'&seq=0&r='+Date.now();
    request("GET",url,null,function(body){
      body=JSON.parse(body);
      body.MemberList=body.MemberList.filter(function(x){
        return x.VerifyFlag===0;
      });
      wxSession.MemberList=body.MemberList.map(function(object){
        var member={};
        member.UserName=object.UserName;
        object.RemarkName?member.Name=object.RemarkName:member.Name=object.NickName;
        member.HeadImgUrl=wxSession.e+object.HeadImgUrl;
        member.Message=[];
        return member;
      });
      wxSession.MemberList.sort(function(a,b){
        return a.Name.localeCompare(b.Name,'zh-Hans-CN');
      });
      Data.contact=wxSession.MemberList;
      router.go({
        path:'/page1'
      });
      console.log("获取联系人列表成功");
      notify(wxSession);//向服务器发送已登陆状态
      resolve(wxSession);
    });
  });
}

//向服务器通知状态
function notify(wxSession){
  var url="https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxstatusnotify?pass_ticket="+wxSession.pass_ticket;
  var body={
    BaseRequest:wxSession.BaseRequest,
    Code:3,
    FromUserName:wxSession.username,
    ToUserName:wxSession.username,
    ClientMsgId:Date.now()
  };
  request("POST",url,body,function(body){
    
  });
}

function syncCheck(wxSession){
  return new Promise(function(resolve,reject){
    var synckey=wxSession.synckey.List.map(o=>o.Key + '_' + o.Val).join('|');
    var url=wxSession.n+'/cgi-bin/mmwebwx-bin/synccheck?r='+Date.now()+"&skey="+wxSession.BaseRequest.skey+"&sid="+wxSession.BaseRequest.sid+"&uin="+wxSession.BaseRequest.uin+"&deviceid="+wxSession.BaseRequest.deviceId+"&synckey="+synckey;
    request("GET",url,null,function(body){
      if(body!=='window.synccheck={retcode:"0",selector:"0"}'){
        resolve(webwxsync(wxSession));
      }
      else{
        resolve(syncCheck(wxSession));
      }
    });
  });
}

function webwxsync(wxSession){  
  return new Promise(function(resolve,reject){
    var body={
      BaseRequest:wxSession.BaseRequest,
      SyncKey:wxSession.synckey,
    };
    var url=wxSession.e+'/cgi-bin/mmwebwx-bin/webwxsync?sid='+wxSession.BaseRequest.sid+'&skey='+wxSession.BaseRequest.skey+'&lang=en_US&pass_ticket=$'+wxSession.pass_ticket+'&rr='+~Date.now();
    request("POST",url,body,function(body,err){
      if(err){
        resolve(webwxsync(wxSession));
      }
      body=JSON.parse(body);
      if(body.BaseResponse.Ret===1101){
        console.log("微信已退出");
        run();
        return;
      }
      if(!body||body.BaseResponse.Ret!==0){
        resolve(webwxsync(wxSession));
      }
      wxSession.synckey=body.SyncKey;

      if(body.AddMsgList.length>0){
        for(var i=0,l=body.AddMsgList.length;i<l;i++){
          if(body.AddMsgList[i].MsgType===1){
            receiveMsg(body.AddMsgList[i].FromUserName,body.AddMsgList[i].ToUserName,body.AddMsgList[i].Content,wxSession);
          }
        }
      }
      resolve(syncCheck(wxSession));
    });
  });
}

function receiveMsg(fromusername,tousername,content,wxSession){
  console.log(fromusername+'>>>'+tousername+' '+content);
  
  if(fromusername===wxSession.username){
    saveMessage(Data,tousername,content,0);
    return;
  }
  for(var i=0,l=wxSession.MemberList.length;i<l;i++){
    if(fromusername===wxSession.MemberList[i]){
      saveMessage(Data,fromusername,content,1);
      return;
    }
  }
}

function sendMsg(username,msg){
  var msgId=(Date.now()+Math.random().toFixed(3)).replace('.','');
  var body={
    BaseRequest:wxSession.BaseRequest,
    Msg:{
      Type:1,
      Content:msg,
      FromUserName:wxSession.username,
      ToUserName:username,
      LocalId:msgId,
      ClientMsgId:msgId
    }
  }
  var url=wxSession.e+"/cgi-bin/mmwebwx-bin/webwxsendmsg?lang=en_US&pass_ticket="+wxSession.pass_ticket;
  request("POST",url,body,function(body){
    saveMessage(Data,username,msg,0);
  });
}

function saveMessage(Data,username,content,from){
  for(var i=0,l=Data.contact.length;i<l;i++){
    if(Data.contact[i].UserName===username){
      Data.contact[i].Message.push({content:content,from:from});
    }
  }
}