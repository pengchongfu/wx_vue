Vue.use(VueRouter);
var app=Vue.extend();
var router=new VueRouter();

Vue.component('navbar',{
  template:'#navbar',
});

Vue.component('tabbar',{
  template:'#tabbar',
});

var page0=Vue.extend({
  data:function(){
      return {
          Data:Data,
      }
  },
  template:'#page0'
});

var page1=Vue.extend({
    template:'#page1'
});

var page2=Vue.extend({
    template:'#page2'
});

var weixin=Vue.extend({
    data:function(){
        return {
            contact:Data.contact
        }
    },
    computed:{
        lastContact:function(){
            return this.contact.filter(function(x){
                return x.Message.length>0;
            });
        }
    },
    template:"#weixin"
});

var tongxunlu=Vue.extend({
    data:function(){
        return {
            contact:Data.contact
        }
    },
    template:"#tongxunlu"
});

var search=Vue.extend({
    data:function(){
        return {
            contact:Data.contact,
            focused:false,
            input:'',
        }
    },
    computed:{
        output:function(){
            var output=[];
            if(this.input){
                var result=[];
                for(var i=0,l=this.contact.length;i<l;i++){
                    result[i]={
                        num:i,
                        value:distance(this.contact[i].Name,this.input)
                    }
                }
                result=result.sort(function(a,b){
                    return a.value-b.value;
                });
                for(var i=0;i<=(result[0].value?2:0);i++){
                    output[i]=this.contact[result[i].num];
                }
            }
            return output;
        }
    },
    methods:{
        onfocus:function(){
            this.focused=true;
        },
        onblur:function(){
            this.focused=false;
        },
        clear:function(){
            this.input='';
        }
    },
    template:"#search"
});

var message=Vue.extend({
    data:function(){
        return {
            contact:Data.contact,
            url:Data.url,
            message:''
        }
    },
    computed:{
        currentContact:function(){
            for(var i=0,l=this.contact.length;i<l;i++){
                if(this.contact[i].UserName===this.$route.params.username){
                    return this.contact[i];
                }
            }
        }
    },
    methods:{
      submit:function(){
          if(this.message&&this.message.replace(/[\r\n]/g,"")){
              sendMsg(this.currentContact.UserName,this.message.substring(0,this.message.length-1));
          }
          this.message='';
      }  
    },
    template:"#message"
});


router.map({
    '/page0':{
    component:page0
    },
    '/page1':{
    component:page1,
    subRoutes:{
        '/weixin':{
            component:weixin
        },
        '/tongxunlu':{
            component:tongxunlu
        },
    }
    },
    '/page2':{
    component:page2,
    subRoutes:{
        '/search':{
            component:search
        },
        '/message/:username':{
            component:message
        } 
    }
    },
});

router.redirect({
    '/':"/page0"
})

router.redirect({
    '/page1':"/page1/weixin"
})

router.start(app,'body');

//修改距离
function distance(a, b) {
	var al = a.length + 1;
	var bl = b.length + 1;
	var result = [];
	var temp = 0;
	for (var i = 0; i < al; result[i] = [i++]) {}
	for (var i = 0; i < bl; result[0][i] = i++) {}		
	for (i = 1; i < al; i++) {
		for (var j = 1; j < bl; j++) {
			temp = a[i - 1] == b[j - 1] ? 0 : 1;
			result[i][j] = Math.min(result[i - 1][j] + 1, result[i][j - 1] + 1, result[i - 1][j - 1] + temp);
		}
	}
	return result[i-1][j-1];
}