# PasswordStrength

##### An extremelty extendable password strength meter.

## Extension points

* Choose what characters are used to calculate the strength. 
  * Boolean flags available are **allowDigits**, **allowAlpha**, **caseSensitive**, and **allowSpecial**
  * Other characters can be added using **otherCharacters**  
* Custom tests can be added to the **tests** option
* Choose your recommended theoretical password entropy using **recommendedEntropy**
* Choose your recommended password length using **recommendedLength**
* Choose how many points a password gets for passing a test using **pointsPerTestPass**
* Create a custom function to process the password score using **scoreCalculated**

## Samples

##### Hex password

 ```javascript
 $('#password').passwordStrength({ allowSpecial: false, caseSensitive: false });
 ```

## Requirements

* jQuery
* jQuery.UI widgets
* jQuery.UI progressBar