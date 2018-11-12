//
function batch_del_old_comments() {
  var api_path = api.comments_user_f(credential.username)
  var reads = rddt_http(api_path)
  
  if(reads.length > 0) {
    console.log("batch_del_old_comments() in")
  }
  
  for(var i=0;i<reads.length;i++) {
    var data = reads[i].data
    var likes = data.likes // true, false, null
    var age = get_age(data.created_utc)
    var name = data.name
    var body = data.body.slice(0, 15)
    
    var msg = Utilities.formatString("%s, %s, %s, %s", name, age, likes, body)
    
    if((age >= MIN_AGE) && (age < MAX_AGE) && (likes == null)) {
      save_json_gd(name)
            
      var r = del_thing(name)      
      if(r) {
        console.info("deleted:%s",msg)            
      } else {
        console.info("not deleted:%s",msg)            
      }
      continue
      
    } else {
      console.info("age invalid:%s",msg)
    }
    
    // don't handle old comments
    if(age > MAX_AGE) {
      break
    }
  }
  
  if(reads.length > 0) {
    console.log("batch_del_old_comments() out")
  }
  
  return 
}

//
function batch_save_wikis_gd(wikis) {
  var wikis = get_wikis(FLAIR_MAPPING)

  if(wikis == undefined) {
    var wikis = get_wikis(FLAIR_MAPPING)
  }
  
  if(wikis.length > 0) {
    console.log("batch_save_wikis_gd() in")
  }

  for(var i=0; i<wikis.length; i++) {
    var page = get_page(wikis[i])
    var ids = get_ids_fr_page(page)
    var ids_gd = get_ids_fr_gd(GD_FOLDER_ID)
    
    if(ids.length < 1) {
      continue  
    }

//    console.info("%s:%s",wikis[i],ids)
    for(var i2 in ids) {
      if(ids_gd.indexOf(ids[i2]) > -1) {
        continue  
      }
      var name = get_name(ids[i2])
      var r = save_json_gd(name)
    }
  }
  if(wikis.length > 0) {
    console.log("batch_save_wikis_gd() out")
  }
}

// XXXXXXXXXx
function batch_clean_voted() {
  var objs = get_upvoted()

  for(var i=0; i<objs.length; i++) {
    var obj = objs[i]
    console.info(obj)
    
    // six months
    if(obj.age > ARCHIVED_AGE) {
      break  
    }
    var name = obj.name
    clean_vote(name)
  }
}

//
function batch_add_goodposts() {
  var saveds = get_saved()
  
  if(saveds.length > 0) {
    console.log("batch_add_goodposts() in")
  }
  for(var i=0;i<saveds.length;i++) {
    var s = saveds[i]
    
    s.catalog = get_wikicatalog(s.flair)
    
    var c = check_values(s.catalog, s.title, s.flair, s.name)
    if(c == false) {
      continue  
    }      
    
    var msg = Utilities.formatString("%s, %s, %s, %s", s.title, s.name, s.flair, s.catalog)
    
    var r = add_goodpost(s)
    
    if(r == code.ADDPOST_ADDED) {
      console.info("added:%s",msg)
      up_vote(s)
      
      var o = to_voter_obj(s, "1")
      set_arg_queue(o)
    } else if(r == code.ADDPOST_NOT) {
      console.info("not added:%s",msg)
      clean_vote(s)
      
      var o = to_voter_obj(s, "0")
      set_arg_queue(o)
    } else if(r == code.ADDPOST_ALREADY) {
      console.info("already added:%s",msg)
      up_vote(s)
      
      var o = to_voter_obj(s, "1")
      set_arg_queue(o)
    } else if(r == code.ADDPOST_EMPTY) {
      console.info("empty page") 
    }
  }
  
  if(saveds.length > 0) {
    console.log("batch_add_goodposts() out")
  } 
}


function batch_voter_vote() {
  var obj = get_voter_queue()
  
  if(obj == undefined) { 
//    console.log("get_voter_queue() is empty")
    return 
  }
  
  if(obj.age > ARCHIVED_AGE) {
    console.log("over aged:%s:%s:%s:%s:%d", obj.title, obj.dir, obj.name, obj.voter, obj.age)
    return
  }
  
  var like = get_voter_likes(obj.name, obj.voter)
  var dir = get_dir_fr_likes(like)
  
  if(dir == obj.dir) {
    console.log("skipped vote:%s:%s:%s:%s:%d", obj.title, obj.dir, obj.name, obj.voter, obj.age)    
    return  
  }
  
  var creds = get_voter_creds(obj.voter)
  
  var payload = {
    "id":obj.name,
    "dir":obj.dir
  }
  
  console.log("voter:%s:%s:%s:%s:%d", obj.title, obj.dir, obj.name, obj.voter, obj.age)    
  // push voter back to voter queue while http call fails?
  var api_path = api.vote 
  var json = rddt_http(api_path, payload, undefined, creds)
  
  return
}

// 1 day = 1440 minutes / 5 minutes = 288 times
// 30(up+down) * 6 users * 5 minutes = 900 minutes
function batch_set_arg_queue() {
  var ups = get_upvoted(20)
  var downs = get_downvoted(10)
  var updowns = ups.concat(downs)
  
  for(var i=0; i<updowns.length; i++) {
    voter_obj.age = updowns[i].age
   
    if(voter_obj.age > ARCHIVED_AGE) {
      continue  
    }
    
    voter_obj.name = updowns[i].name
    
    if(i < ups.length) { 
      voter_obj.dir = "1"
    } else {
      voter_obj.dir = "-1"
    }
      
    voter_obj.title = updowns[i].title.slice(0,15)    
    set_arg_queue(voter_obj)
  }
}

// untested
function batch_del_message_fr_voter() {
  var voters = voter_obj.voter
  
  for(var i in voters) {
    del_message_fr_voter(voters[i]) 
  }
}

// 
function batch_targeted_posts() {
  var comments = get_comments(25)
  
  for(var i in comments) {
    var data = comments[i].data
  }
  
  return comments
  
}
