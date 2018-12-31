redditlib.init_project(secret.subreddit, secret.secret_sr, secret.creds_main, secret.creds_voters, secret.creds_atwikibot, secret.folder_id, secret.flair_mapping)
redditlib.check_init()

// bot x 2, guide script
updaterlib.init_project(secret.doc_sr, secret.doc_filename, secret.doc_id, secret.doc_wiki, secret.page_header, secret.creds_wikibot, secret.forbidden_words)
updaterlib.check_init()


mlablib.init_project(secret.mlab)
mlablib.check_init()


function batch_month() {
  console.info("batch_month()")
  updaterlib.batch_update_doc_force()
  redditlib.batch_set_arg_queue()
}


function batch_day() {
  console.info("batch_day")
  updaterlib.batch_update_doc()
  redditlib.batch_del_old_comments()
  redditlib.batch_save_wikis_gd()
}


function batch_hours2() {
//  console.info("batch_hours2()")
  redditlib.batch_add_goodposts()
}

// 15m
function batch_comments_snapshot() {
  var new_comments = redditlib.get_comments(20)
  var new_c_names = redditlib.get_names_fr_obj(new_comments)
  
  for(var i=0; i<new_c_names.length; i++) {
    var count = mlablib.get_matched_count("snapshot", new_c_names[i])
    
    if(count > 0) {
      continue  
    }
    
    var parent_full = redditlib.get_parent_full(new_c_names[i])
    var title = redditlib.get_t3_data(parent_full).title
    
    var doc = {
      name:new_c_names[i],
      data:parent_full
    }
    
    var r = mlablib.insert_documents("snapshot", doc) 
    
    if(r) {
      console.log("new snapshot inserted:%s:%s:%s", new_c_names[i], title, parent_full)
    } else {
      console.log("snapshot not inserted:%s:%s:%s", new_c_names[i], title, parent_full) 
    }   
  }
}

// need to deploy new version once doget related function updated
function doGet(e) {
  var name = e.parameter.name
  var dir = e.parameter.dir
  var data = redditlib.get_parent(name)
  var age = redditlib.get_age(data.created_utc)
  var title = data.title.slice(0,15)
  var logged_user = e.parameter.logged_user

  var obj = {
    "name":name,
    "dir":dir,
    "age":age,
    "title":title,
    "voter":redditlib.voter_obj.voter,
    "logged_user":logged_user    
  }
  
  if(obj["logged_user"] == secret.creds_main.username) {
    redditlib.set_arg_queue(obj)
    console.log("received:%s", obj)
    
    var ret_obj = obj
  } else {
    var msg = "not from main user, skipped:" + JSON.stringify(obj)
    console.log(msg)
    
    var ret_obj = {
      "result":msg
    }
  }
  
  var json_text = ContentService.createTextOutput(JSON.stringify(ret_obj)).setMimeType(ContentService.MimeType.JSON); 
  return json_text
}


function clean_arg() {
  redditlib.clean_argument("VOTER_QUEUE")
  redditlib.clean_argument("ARG_QUEUE")
  dump_arg()
}


function dump_arg() {
  Logger.log(redditlib.dump_argument("VOTER_QUEUE"))
  Logger.log(redditlib.dump_argument("ARG_QUEUE"))
}

// 30m
function batch_voter_vote() {
  redditlib.batch_voter_vote()  
}

// daily, trigged at mid-1am
function batch_get_interesting_posts() {
  var objs = []
  
  var comments = redditlib.get_comments(redditlib.AVERAGE_DAILY_POSTS)
   
  var yesterday = new Date()
  yesterday.setDate(yesterday.getDate()-1)
  
  for(var i in comments) {
    var data = comments[i].data
    var title = data.title.toLowerCase()
    var selftext = data.selftext.toLowerCase()
    
    var date = new Date(data.created_utc * 1000)
    
    if(!httplib.is_same_date(yesterday, date)) {
      continue    
    }

    var keywords = []
    
    for(var i2 in secret.interesting_keywords) {
      var keyword = secret.interesting_keywords[i2]  
      var name = data.name
      var id = data.id
      
      if(selftext.indexOf(keyword) > -1) {
        keywords.push(keyword)        
      }      
      
      if(title.indexOf(keyword) > -1) {
        keywords.push(keyword)        
      }            
    }  
    
    
    if(keywords.length > 0) {
      keywords = httplib.get_unique(keywords)
      
      var obj = {
        "name":name,
        "id":id,
        "title":title.slice(0,20),
        "keywords":keywords
      }
      
      objs.push(obj)
    }
  }

  var mail_title = Utilities.formatString("[reddit] %d", objs.length)
  var mail_lines = ""
  var link_prefix = "https://redd.it/"
  
  for(var i in objs) {
    var obj = objs[i]
    var link = link_prefix + obj.id
    var index = parseInt(i) + 1
    mail_lines = mail_lines + Utilities.formatString("[%02d]%s ,%s ,%s\n\n", index, obj.keywords, link, obj.title)
  }
  
  if(objs.length > 0) {
    var mail = Session.getActiveUser().getEmail()
    
    MailApp.sendEmail(mail, mail_title, mail_lines)
  }
}