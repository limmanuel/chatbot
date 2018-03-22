var mongoose = require('mongoose');
var userSchema = mongoose.Schema({
	user_id: {
		type: String
	},
	user_name: {
		type: String
	},
	access_token:{
		type: String
	},
	pages: [{
		page_id: {
			type: String
		},
		page_name: {
			type: String
		},
		subscribed: {
			type: Boolean
		},
		page_token: {
			type: String
		},
		qnamaker: {
			kbid: {
				type: String
			},
			urls: [{
				url: {
					type: String
				}
			}]
		}
	}]
});

var User = module.exports = mongoose.model('User', userSchema);

module.exports.newUser = function(newUser, callback){
    console.log("======new User ========"+JSON.stringify(newUser));
	newUser.save(callback);
}
module.exports.getUsers = function(callback){
	User.find(callback);
}
module.exports.addPage = function(user_id, page, callback){
	let query = {user_id: user_id};
	User.update(query,
	{
		$push:{
			pages: page
		}
	}, callback);
}
module.exports.updateSubscription = function(user_id, page_id, subscribed, callback){
	let query = {user_id: user_id, "pages.page_id": page_id};
	User.update(query,
	{
		$set:{
			"pages.$.subscribed": subscribed
		}
	}, callback);
}
module.exports.getUsersWithPage = function(page_id, callback){
	let query = {pages: {$elemMatch: {page_id: page_id}}};
	User.findOne(query,callback);
}
module.exports.createQna = function(user_id, page_id, qnamaker, callback){
	console.log("creating qna");
	let query = {user_id: user_id, pages: {$elemMatch: {page_id: page_id}}};
	User.update(query, {
		$set: {
			"pages.$.qnamaker": qnamaker
		}
	})
}