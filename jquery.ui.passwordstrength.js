(function($, window, undefined) { 
  var _methods = {
    distinct: function(array){
      if(!$.isArray(array)){
       throw 'distinct takes an array as it\'s first argument'; 
      }
      var a = [],
          item;
      for(var i = 0; i < array.length; i++){
        item = array[i];
        if($.inArray(item, a) < 0){
         a.push(item); 
        }
      }  
      return a;
    },
    convertToArray: function(str){
      if(typeof str !== 'string') {
       throw 'convertToArray takes a string as it\'s first argument'; 
      }
      var a = [];
      for(var i = 0; i < str.length; i++){
          a.push(str[i]);
      }
      return a;
    },
    log2: function(number) {
      return Math.log(number) / Math.LN2;
    },
    calculateTheoreticalEntropy: function(value, available) {
      var log2 = _methods.log2(available.length);
      return Math.round(value.length * log2);
    },
    getCharacterRange: function(startCode, endCode) {
        var array = [];
        for(var i = startCode; i <= endCode; i++) {
          array.push(String.fromCharCode(i));
        }
        return array.join('');
    },
    calculatePasswordScore: function(password) {
      var total = recommendedEntropy,
          score = {
            recommendedEntropy: recommendedEntropy,
            totalAvailablePoints: 0,
            points: {
              theoreticalEntropy: _methods.calculateTheoreticalEntropy(password, available)
            }
          };
      
      score.points.total = Math.min(score.points.theoreticalEntropy, recommendedEntropy);
      
      for(var name in tests) {
        var r = tests[name],
            p = 0;
        if($.isFunction(r.test)) {
          total += pointsPerTestPass; 
          if(r.test(password)) {
            p = pointsPerTestPass;
          }
          score.points[name] = p;
          score.points.total += p;
        }
      }
      
      score.totalAvailablePoints = total;
      score.normalized = Math.round((score.points.total / total) * 100);
      
      if(debugScore === true && console.log) {
        console.log(score);
      }
      return score;
    },
    createRegexClass: function(str, not){
      if(not === true) {
        return '[^' + str + ']';
      }
      return '[' + str + ']';
    }
  };

  var allowDigits = true,
      allowAlpha = true,
      caseSensitive = true,
      allowSpecial = true,      
      digits = _methods.getCharacterRange(48, 57),
      lower = _methods.getCharacterRange(97, 122),
      upper = _methods.getCharacterRange(65, 90),
      special = (function(){
        return _methods.getCharacterRange(32, 47) 
             + _methods.getCharacterRange(58, 64)
             + _methods.getCharacterRange(91, 96)
             + _methods.getCharacterRange(123, 126);
      })(),
      other = '',
      digitsPattern = _methods.createRegexClass(digits),
      lowerPattern = _methods.createRegexClass(lower),
      upperPattern = _methods.createRegexClass(upper),
      specialPattern = _methods.createRegexClass(special),
      otherPattern = _methods.createRegexClass(other),
      tests = { },
      recommendedEntropy = 80,
      recommendedLength = 16,
      minLength = 8,
      pointsPerTestPass = 10,
      available = '',
      debugScore = true;
  
  if(allowAlpha) {
    if(caseSensitive){
      available += upper;
      tests.casing = new RegExp(lowerPattern + '+' + upperPattern + '+');
    } 
    available += lower;
  }
  if(allowDigits) {
    available += digits;
    tests.digits = new RegExp(digitsPattern);
    if(allowSpecial || !!other || allowAlpha) {
      var not = _methods.createRegexClass(digits, true);
      tests.digitsWithin =  new RegExp(not + '+' + digitsPattern + '+' + not + '+' );
    }
  }
  if(allowSpecial) {
    available += special;
    tests.special = new RegExp('[' + special + ']');
  }
  if(!!other) {
    available += other;
    tests.other = new RegExp('[' + other + ']');
  }
  tests.allDistinctCharacters = new (function() {
    this.test = function(value) {
      var array = _methods.convertToArray(value);
      var distinct = _methods.distinct(array);
      return !!value && value.length === distinct.length;
    };
  })();  
  tests.noRepeatingCharacters = new (function() {
    var r = /(.)\1/;
    this.test = function(value) {
      return !!value && !r.test(value);
    };
  })();  
  tests.noKeyboardWalking = new (function() {
    var keyboardWalks = [
        '1234567890',
        'qwertyuiop',
        'asdfghjkl',
        'zxcvbnm'
      ];
    this.test = function(value) {
      if (!value) {
        return false;
      }
      var walk,
		      reverseWalk,
          s;
	    for(var i = 0; i < keyboardWalks.length; i++){
        walk = keyboardWalks[i];
		    reverseWalk = _methods.convertToArray(walk);
		    reverseWalk.reverse();
		    reverseWalk = reverseWalk.join('');
		    for(var j = 0; j < value.length - 1; j++) {
		      for(var k = value.length - j; k > 2; k--) {
            s = value.substr(j, k).toLowerCase();
            if (walk.search(s) > -1 || reverseWalk.search(s) > -1) {
              return false; 
            }
          }
        }
      }
      return true;
    };
  })();
  tests['lengthGreaterThanOrEqualTo' + recommendedLength] = new (function(){
    this.test = function(value){
      return value.length >= recommendedLength;
    };
  })();
  available = _methods.convertToArray(available);
  available = _methods.distinct(available);
  
  $('#strength').text('Available characters: ' + available.join(''));
  
  $('#password').keyup(function(e){ 
    var self = $(this),
        value = self.val(),
        short = value.length < minLength,
        array = _methods.convertToArray(value),
        valid = (function(){
          for(var i = 0; i < array.length; i++) {
            var c = (allowAlpha === true && caseSensitive === false) ? array[i].toLowerCase() : array[i];
            if($.inArray(c, available) < 0) {
              return false;
            }
          }
          return true;
        })(),
        score = _methods.calculatePasswordScore(value),
        span,
        strength = $('#strength').empty();
      
    if(valid === true && short === false && !!score){
      for(var name in score.points){
        if(name === 'total') continue;
        strength.append($('<div></div>').append($('<span></span>').text(name + ': ' + score.points[name])));
        
      }
    }
  });
})(jQuery, this);