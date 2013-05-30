# PasswordStrength

##### An extremely extendable password strength meter.

## Features

* Calculates the theoretical entropy of a password
  * [Wikipedia article on password strength](http://en.wikipedia.org/wiki/Password_strength), [Entropy section](http://en.wikipedia.org/wiki/Password_strength#Entropy_as_a_measure_of_password_strength)
* Checks if a password contains keyboard walking of 3 or more characters
* Checks if any character is immediately repeated
* Checks if any character in the password is used more than once
* Checks if there is an upper case alpha character within the password if applicable
* Checks if there is a digit in the password if applicable
* Checks if there is a digit within the password if applicable
* Checks if there is a special character in the password if applicable
* Checks if the password reaches recommended length

## Extension points

* Choose what characters are used to calculate the strength. 
  * Boolean flags available are **allowDigits**, **allowAlpha**, **caseSensitive**, and **allowSpecial**
  * Other characters can be added using **otherCharacters**  
* Custom tests can be added to the **tests** option
* Choose your recommended theoretical password entropy using **recommendedEntropy**
* Choose your recommended password length using **recommendedLength**
* Choose how many points a password gets for passing a test using **pointsPerTestPass**
  * A higher pointsPerTestPass gives means that the tests contribute more to the score than the theoretical entropy
* Create a custom function to process the password score using **scoreCalculated**

## Examples

##### Hex password

 ```javascript
 $('#password').passwordStrength({ allowSpecial: false, caseSensitive: false });
 ```

##### Custom test

Custom tests can either be an object with a test function accepting a value or a **RegExp** object
 
 ```javascript
 $('#password').passwordStrength({ 
   minLength: 3,
   tests: {
     isNotBannedPassword: new (function(){
	   var bannedPasswords = [ 'love', 'secret', 'sex', 'god', 'password' ];
       this.test = function(value) {
	     var v = value.toLowerCase();
		 return $.inArray(v, bannedPasswords) < 0;
	   };
     })(),
     endsWithDigit: /\d$/g     
   });
 ```

##### Change password recommendations and scoring settings

 ```javascript
 $('#password').passwordStrength({ recommendedLength: 20, recommendedEntropy: 96, pointsPerTestPass: 20 });
 ```
 
## Requirements

* jQuery
* jQuery.UI widgets
* jQuery.UI progressBar