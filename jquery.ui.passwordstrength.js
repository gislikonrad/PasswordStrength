(function($, window, undefined){
	$.widget('jquery.passwordStrength', {
		options: {
			allowDigits: true,
			allowAlpha: true,
			caseSensitive: true,
			allowSpecial: true,
			otherCharacters: '',
			recommendedEntropy: 80,
			recommendedLength: 16,
			minLength: 8,
			pointsPerTestPass: 10,
			progressElement: undefined,
			tests: {},
			debug: function(score) {}
		},
		_methods: {
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
				var self = this,
					m = self._methods,
					log2 = m.log2(available.length);
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
				var self = this,
					options = self.options,	
					variables = self._variables,
					methods = self._methods,
					theoreticalEntropy = methods.calculateTheoreticalEntropy.call(self, password, variables.available),
					score = {
						recommendedEntropy: options.recommendedEntropy,
						totalAvailablePoints: options.recommendedEntropy,
						points: {
							theoreticalEntropy: theoreticalEntropy,
							total: Math.min(theoreticalEntropy, options.recommendedEntropy)
						}
					};
					
			  
				 for(var name in options.tests) {
					var r = options.tests[name],
						p = 0;
					if($.isFunction(r.test)) {
						score.totalAvailablePoints += options.pointsPerTestPass; 
						if(r.test(password)) {
							p = options.pointsPerTestPass;
						}
						score.points[name] = p;
						score.points.total += p;
					}
				 }
			  
				score.normalized = Math.round((score.points.total / score.totalAvailablePoints) * 100);
			  
				self.options.debug(score);
			  
				return score;
			},
			createRegexClass: function(str, not){
			  if(not === true) {
				return '[^' + str + ']';
			  }
			  return '[' + str + ']';
			},
			createTests: function() {
				var self = this,
					variables = self._variables,
					characterSets = variables.characterSets,
					patterns = variables.patterns,
					options = self.options,
					methods = self._methods,
					tests = {};					
				
				variables.available = '';
			  if(options.allowAlpha === true) {
				if(options.caseSensitive === true){
				  variables.available += characterSets.upper;
				  // Tests whether there is an upper case letter within the password. A single capitalized word will not pass this test.
				  tests.casing = new RegExp(patterns.lower + '+' + patterns.upper + '+');
				} 
				variables.available += characterSets.lower;
			  }
			  if(options.allowDigits === true) {
				variables.available += characterSets.digits;
				// Tests whether there are digits in the password
				tests.digits = new RegExp(patterns.digits);
				if(options.allowSpecial === true || !!characterSets.other || options.allowAlpha === true) {
					// Tests whether there are digits within the password. Passwords with digits at the start or end only will not pass this test.
				    tests.digitsWithin = new RegExp(patterns.notDigits + '+' + patterns.digits + '+' + patterns.notDigits + '+' );
				}
			  }
			  if(options.allowSpecial === true) {
				variables.available += characterSets.special;
				// Tests whether there are special characters in the password
				tests.special = new RegExp(patterns.special);
			  }
			  if(!!options.otherCharacters) {
				variables.available += characterSets.other;
				// Tests whether any of the custom characters are in the password
				tests.other = new RegExp(patterns.other);
			  }
			  // Tests whether all the characters in the password are distinct
			  tests.allDistinctCharacters = new (function() {
				this.test = function(value) {
				  var array = methods.convertToArray(value);
				  var distinct = methods.distinct(array);
				  return !!value && value.length === distinct.length;
				};
			  })();  
			  // Tests whether any of the characters in the password are immediately repeated.
			  tests.noImmediatelyRepeatingCharacters = new (function() {
				var r = /(.)\1/;
				this.test = function(value) {
				  return !!value && !r.test(value);
				};
			  })();  
			  // Tests whether the password has keyboard walking of 3 or more characters
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
						reverseWalk = methods.convertToArray(walk);
						reverseWalk.reverse();
						reverseWalk = reverseWalk.join('');
						for(var j = 0; j < value.length - 1; j++) {
							for(var k = value.length - j; k > 2; k--) {
								s = value.substr(j, k).toLowerCase();
								if (walk.indexOf(s) > -1 || reverseWalk.indexOf(s) > -1) {
								  return false; 
								}
							}
					}
						}
					return true;
				};
			  })();
			  // Tests whether the password is of equal or greater length than the recommended length option
			  tests['lengthGreaterThanOrEqualTo' + options.recommendedLength] = new (function(){
				this.test = function(value){
				  return !!value && value.length >= options.recommendedLength;
				};
			  })();			  
			  
			  variables.available = methods.convertToArray(variables.available);
			  variables.available = methods.distinct(variables.available);
			  
			  return tests;
			},
			getColor: function(percentage) {
				var self = this,
					p = Math.min(percentage, 100),
					max = 255,
					step = max / 50,
					g = Math.min(p, 50) * step,
					r = Math.min(100 - p, 50) * step,
					b = 0,
					toHex = function(number) {
						var h = Math.floor(number).toString(16);
						return h.length == 1 ? '0' + h : h;
					},
					ghex = toHex(g),
					rhex = toHex(r),
					bhex = toHex(b);
			
				return '#' + rhex + ghex + bhex;
			}
		},
		_variables: {
			characterSets : {},
			patterns: {}
		},
		_create: function(){
			var self = this,
				options = self.options,
				methods = self._methods,
				
				// Create charater sets
				digits = (self._variables.characterSets.digits = methods.getCharacterRange(48, 57)),
				lower = (self._variables.characterSets.lower = methods.getCharacterRange(97, 122)),
				upper = (self._variables.characterSets.upper = methods.getCharacterRange(65, 90)),
				special = (self._variables.characterSets.special = (function(){
														return methods.getCharacterRange(32, 47) 
															 + methods.getCharacterRange(58, 64)
															 + methods.getCharacterRange(91, 96)
															 + methods.getCharacterRange(123, 126);
													  })()),
				other = (self._variables.characterSets.other = options.otherCharacters),
				
				// Create inclusive regex patterns
				digitsPattern  = (self._variables.patterns.digits = methods.createRegexClass(digits)),
				lowerPattern   = (self._variables.patterns.lower = methods.createRegexClass(lower)),
				upperPattern   = (self._variables.patterns.upper = methods.createRegexClass(upper)),
				specialPattern = (self._variables.patterns.special = methods.createRegexClass(special)),
				otherPattern   = (self._variables.patterns.other = methods.createRegexClass(other)),
				
				// Create exclusive regex patterns
				notDigitsPattern  = (self._variables.patterns.notDigits = methods.createRegexClass(digits, true)),
				notLowerPattern   = (self._variables.patterns.notLower = methods.createRegexClass(lower, true)),
				notUpperPattern   = (self._variables.patterns.notUpper = methods.createRegexClass(upper, true)),
				notSpecialPattern = (self._variables.patterns.notSpecial = methods.createRegexClass(special, true)),
				notOtherPattern   = (self._variables.patterns.notOther = methods.createRegexClass(other, true)),
				
				tests = (options.tests = $.extend(methods.createTests.call(self), options.tests)),
				
				progress = (self._variables.progressBar = (options.progressElement || $('<div></div>').progressbar().insertAfter(self.element).width(self.element.outerWidth())));
		},
		_init: function(){
			var self = this,
				methods = self._methods,
				options = self.options,
				variables = self._variables,
				input = self.element.val(''),
				progress = variables.progressBar.progressbar({value: 0});
				
			input
				.unbind('keyup', self.keyup)
				.bind('keyup', { widget: self }, self.keyup);
			
		},
		keyup: function(event) {
			var self = $(this),
				widget = event.data.widget,
				value = self.val(),				
				options = widget.options,
				variables = widget._variables,
				methods = widget._methods,
				array = methods.convertToArray(value),
				valid = (function(){
					if(value.length < options.minLength) {
						return false;
					}
				
					for(var i = 0; i < array.length; i++) {
						var c = (options.allowAlpha === true && options.caseSensitive === false) ? array[i].toLowerCase() : array[i];
						if($.inArray(c, variables.available) < 0) {
							return false;
						}
					}
					return true;
					})(),
				score = methods.calculatePasswordScore.call(widget, value),
				total = valid === true ? score.normalized : false;
				
			variables
				.progressBar
				.progressbar({ value: total })
				.find('.ui-progressbar-value')
				.css('background', methods.getColor.call(self, score.normalized));
		}
	});
})(jQuery, this);