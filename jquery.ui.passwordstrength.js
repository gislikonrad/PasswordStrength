(function($, window, undefined){
	$.widget('jquery.passwordStrength', {
		options: {
			allowDigits: true,
			allowAlpha: true,
			caseSensitive: true,
			allowSpecial: true,
			allowSpace: false,
			otherCharacters: '',
			recommendedEntropy: 128,
			recommendedLength: 16,
			minLength: 8,
			defaultPenaltyPerTestFail: 10,
			weakestColor: '#f00',
			strongestColor: '#0f0',	
			tests: {},
			scoreCalculated: function(score) {}
		},
		availableCharacters: function() {
			return this._variables.available.join('');
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
			ensureNegative: function(number) {
				return -1 * Math.sqrt(Math.pow(number, 2));
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
					targetEntropy = options.recommendedEntropy,
					defaultPenalty = methods.ensureNegative(options.defaultPenaltyPerTestFail),
					score = {
						targetEntropy: targetEntropy,
						totalAvailablePoints: targetEntropy,
						points: {
							theoreticalEntropy: theoreticalEntropy,
							estimatedEntropy: Math.min(theoreticalEntropy, targetEntropy)
						}
					};
			  
				 for(var name in options.tests) {
					var t = options.tests[name],
						p = 0;
					if($.isFunction(t.test)) {
						if(!!password && !t.test(password)) {
							if(t.penalty){
								p = methods.ensureNegative(t.penalty);
							}
							else {
								p = defaultPenalty;
							}
						}
						score.points[name] = p;
						score.points.estimatedEntropy += p;
					}
				 }
			  
			    score.points.estimatedEntropy = Math.max(score.points.estimatedEntropy, 0);
				score.normalized = Math.round((score.points.estimatedEntropy / score.totalAvailablePoints) * 100);
			    score.color = !!password ? methods.getStrengthColor.call(self, score.normalized) : '';
				score.validity = methods.calculateValidity.call(self, password);
			    
				self.options.scoreCalculated.call(self.element, score);
			  
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
				tests.hasDigits = new RegExp(patterns.digits);
				if(options.allowSpecial === true || !!characterSets.other || options.allowAlpha === true) {
					// Tests whether there are digits within the password. Passwords with digits at the start or end only will not pass this test.
				    tests.hasDigitsWithin = new RegExp(patterns.notDigits + '+' + patterns.digits + '+' + patterns.notDigits + '+' );
				}
			  }
			  if(options.allowSpecial === true) {
				variables.available += characterSets.special;
				// Tests whether there are special characters in the password
				tests.hasSpecial = new RegExp(patterns.special);
			  }
			  if(!!options.otherCharacters) {
				variables.available += characterSets.other;
				// Tests whether any of the custom characters are in the password
				tests.hasOther = new RegExp(patterns.other);
			  }
			  // Tests whether all the characters in the password are distinct
			  tests.allCharactersDistinct = new (function() {
				var penaltyPerRepetition = 2;
				this.penalty = 0;
			  
				this.test = function(value) {
				  this.penalty = methods.ensureNegative(options.defaultPenaltyPerTestFail);
				  
				  var array = methods.convertToArray(value),
					  distinct = methods.distinct(array),
					  difference = value.length - distinct.length;
				  
				  this.penalty -= difference * penaltyPerRepetition;					  
				  return difference === 0;
				};
			  })();  
			  // Tests whether any of the characters in the password are immediately repeated.
			  tests.noImmediatelyRepeatingCharacters = new (function() {			  
				var r = /(.)\1/,
					penaltyPerImmediateRepetition = 3;
				
				this.penalty = 0;
				
				this.test = function(value) {
				  var hasImmediatelyRepeatingChars = r.test(value);
				  
				  if(hasImmediatelyRepeatingChars){
					var previous,
						c;
					this.penalty = methods.ensureNegative(options.defaultPenaltyPerTestFail);
					for(var i = 0; i < value.length; i++){
						c = value[i];
						if(!!previous && previous == c){
							this.penalty -= penaltyPerImmediateRepetition;
						}
						previous = c;
					}
				  }
				  
				  return !hasImmediatelyRepeatingChars;
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
				  return value.length >= options.recommendedLength;
				};
			  })();			  
			  
			  variables.available = methods.convertToArray(variables.available);
			  variables.available = methods.distinct(variables.available);
			  
			  return tests;
			},
			getStrengthColor: function(percentage) {
				var self = this,
					methods = self._methods,
					colors = self._variables.colors,
					weak = colors.weak,
					strong = colors.strong;
				return '#' +
					methods.getHexColor(percentage, weak.red, strong.red) +
					methods.getHexColor(percentage, weak.green, strong.green) +
					methods.getHexColor(percentage, weak.blue, strong.blue);
			},
			getHexColor: function(percentage, weak, strong) {
				var p = percentage - 50,
					step = (strong - weak) / 50,
					max = Math.max(weak, strong),
					c;
					
				if(percentage <= 50 && weak < strong || percentage > 50 && weak > strong) {
					c = -1 * Math.abs(p * step) + max;
				}
				else {
					c = max;
				}
				
				c = Math.floor(c).toString(16);
				return c.length === 1 ? '0' + c : c;
			},
			parseColors: function(){
				var self = this,
					methods = this._methods,
					options = this.options,					
					weak = (self._variables.colors.weak = methods.parseColor(options.weakestColor)),
					strong = (self._variables.colors.strong = methods.parseColor(options.strongestColor));
				return { weak: weak, strong: strong };
			},
			parseColor: function(hex) {
				var color = hex,
					regex = /^\#?[0-9abcdef]{6}$|^\#?[0-9abcdef]{3}$/gim;
				
				if(!regex.test(hex)) {
					throw hex + ' is not a valid hexadecimal color notation.';
				}
					
				if(color.indexOf('#') === 0) {
					color = color.substr(1);
				}
				if(color.length === 3) {
					color = color[0] + color[0] +
							color[1] + color[1] +
							color[2] + color[2];
				}
				return {
					red: parseInt(color.substr(0, 2), 16),
					green: parseInt(color.substr(2, 2), 16),
					blue: parseInt(color.substr(4, 2), 16)
				};
			},			
			calculateValidity: function(password){
				var self = this,
					methods = self._methods,
					options = self.options,
					variables = self._variables,
					areAllCharactersValid = function(value){
						var array = methods.convertToArray(value);				
						for(var i = 0; i < array.length; i++) {
							var c = (options.allowAlpha === true && options.caseSensitive === false) ? array[i].toLowerCase() : array[i];
							if($.inArray(c, variables.available) < 0) {
								return false;
							}
						}
						return true;
					};
				return {
					minLengthReached: password.length >= options.minLength,
					allCharactersValid: areAllCharactersValid(password)
				};
			}			
		},
		_variables: {
			characterSets : {},
			patterns: {},
			colors: {}
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
														var start = options.allowSpace === true ? 32 : 33;
														return methods.getCharacterRange(start, 47) 
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
				
				colors = (self._variables.colors = methods.parseColors.call(self));
		},
		_init: function(){
			var self = this,
				methods = self._methods,
				options = self.options,
				variables = self._variables,
				input = self.element.val('');
				
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
				score = methods.calculatePasswordScore.call(widget, value);
		}
	});
})(jQuery, this);