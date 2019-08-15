//
// lilyPondAdapter.js
//
// to create documentation:
// %: cd ~/Documents/HTML/lilyPondAdapterJS
// %: documentation build lilyPondAdapter.js -f html -o docs

//  this module is used to translate data from PracticeRoom pages (Tone.js formats) 
//  into lilyPond files (.ly)  The .ly files when opened in lilyPond can be compiled 
//  into a pdf of standard music notation.
//
//  also translates a subset of lilypond formated code into 
//  arrays suitable for use with Tone.js
//
//
//
/*

The javascript function returned is named lpAdapter

lpAdapter api:
	createLilyPondFile
	setScoreParameters
	setGrandStaffScoreParameters
	setChoraleScoreParameters
    setCPMelodyParameters
	translateLilyToToneJS
	lilyPickupMeasure
	getLilyEntryScoreParams

    generateReport
    appendReportToLilyFile
    chordsContainSamePitchNames
    getNotes1Percentage
    getNotes2Percentage
    getDurations1Percentage
    getDurations2Percentage
    getTotalPercentage

usage:
	lpAdapter.setScoreParameters(json);
	var lilyscore = lpAdapter.createLilyPondFile();
	var melodyAndDuration = lpAdapter.translateLilyToToneJS(lilyNoteCode);



*/
// Also use lilypond format as an addition input format for Tone.json
// TODO: enable additional parsing capability
// 1. total number of measures (this is available from Rhythm.js)
// 2. multiple tied notes
// 3. \partial (pickup measure)
// 4. \composer
// 5. \title
// 6. \clef
// 7. \name

/**
 * @overview This module is a IIFE (Immediately Invoked Function Expression) and
 * it returns a var with the name of lpAdapter.  This document contains its public API.
 * The lilyPondAdapter.js module contains functions used to translate from 
 * lilypond format to Tone.js and vice versa.
 * @module lilyPondAdapter.js
 * @example
 * use the script tag to add this file
 * <script src="path/to/lilyPondAdapter.js"></script>
 */
var lpAdapter = (function() {

    // module GLOBALS
    var myJSONType;
    var myFileName;
	var myNotes; 
	var myDurations;
    var myTimeSignature;
    var myKeySignatures;
    var myRomanNumerals
    var myPickupMeasure;
    var myPickupMeasureLength;
    var myTempo;
    var myClef;
    var myBarlines;
    var myChords;
    var myComposer;
    var myOpus;
    var errorIndexArray;
    var errorIndexArray2;
    
    var myComments = [];
    var commentIndex = 0;
    var comment = "";


    var myJSONType2;
    var myFileName2;
	var myNotes2; 
	var myDurations2;
    var myTimeSignature2;
    var myKeySignatures2;
    var myRomanNumerals2;
    var myPickupMeasure2;
    var myPickupMeasureLength2;
    var myTempo2;
    var myClef2;
    var myBarlines2;

	var myNotes3; 
	var myDurations3;
	var myNotes4; 
	var myDurations4;

    var myDiceStaff;
    var myNewStaffAndClef;
    var newStaffAndClef = false;
    var myLilyBass = "";
    
    var isTriplet = false;
    var numOfTriplets = 0;
    var lastLilyDuration = '';
    
    // THESE vars ARE FOR THE INPUT LILYPOND FORMAT feature
    var lilyPickupMeasure = '';
    var lilyTimeSignature = '';
    var lilyKeySignature = '';
    var lilyTempo = '';
    var lilyTupletNotes = [];
    
    
    // pitches = list of pitch_OctaveNumbers 
    // durations = list of rhythms, possibly containing rests
//    function makeLilyNotes(pitches, durations, keySignatures, romanNumerals) {
    function makeLilyNotes(pitches, durations, keySignatures, romanNumerals, errors) {
        var errorNoteHighlightInProgress = false;
        var errorRestHighlightInProgress = false;
        var noteErrorIndex = 0;
        var restErrorIndex = 0;
        var noteErrors;
        var restErrors;
        var restHighlighted = false;
        var containsNoteErrorArray = false;
        var containsRestErrorArray = false;
        if(errors !== undefined) {
            noteErrors = errors[0];
            restErrors = errors[1];
            if(noteErrors !== undefined && noteErrors.length !== 0) {
                containsNoteErrorArray = true;
            }
            if(restErrors !== undefined && restErrors.length !== 0) {
                containsRestErrorArray = true;
            }
        }
//        console.log('noteErrors='+noteErrors+' restErrors='+restErrors);
        // check for json type
//        console.log('lpAdapter: makeLilyNotes(): myJSONType ='+myJSONType);
        var lilyText = ' {';
        var pitchIndex = 0;
        var isRest = false;
        var lilyNote = '';
        var lilyLetter = '';
        var lilyDuration = '';
        var lilySpecialBarline = '';
        var tripletNotes = '';
        var hasSpecialBarline = false;
        var measureNumsOfSpecialBarlines = getBarlineMeasureNumbers();
        var measureNumericTotal = 0;
        var totalNumericPerMeasure = calcMeterNumericTotal();
        var thisMeasureNumber = 0;
        var pitchesLength = pitches.length;
        lastLilyDuration = '';

//        console.log('makeLilyNotes(): pitches='+pitches+' durations='+durations);
        if(myPickupMeasureLength != '') {
            lilyText += '\\partial ' + myPickupMeasureLength + ' ' + myPickupMeasure;
//            console.log('\\partial ' + myPickupMeasureLength + ' ' + myPickupMeasure);
        }
     
        // using first note to set the relative value
//        console.log('durations.length='+durations.length);
        if(myPickupMeasureLength != "") {
//            measureNumericTotal = NoteTypeToNumeric[myPickupMeasureLength];
        }
        thisMeasureNumber = 0;
        for(let i=0; i<durations.length; i++) {        
        
            // need to keep track of measures and new barline locations
            measureNumericTotal += Math.abs(rhythmTextToNumbers[durations[i]])
//            console.log('measureNumericTotal='+measureNumericTotal);
            if(measureNumericTotal == totalNumericPerMeasure) {
                thisMeasureNumber++;
                // new bar, look for special barlines
//                console.log('measureNumsOfSpecialBarlines='+measureNumsOfSpecialBarlines+' thisMeasureNumber='+thisMeasureNumber);
                if(measureNumsOfSpecialBarlines.includes(thisMeasureNumber)) {
                    // insert the barline
                    lilySpecialBarline = ' '+getBarline(thisMeasureNumber);
                    hasSpecialBarline = true;
                } else {
                    hasSpecialBarline = false;                
                }
                // reset and start counting again next iteration
                measureNumericTotal = 0;
            }
        
            lilyNote = '';
            lilyLetter = '';
            lilyDuration = '';
            if(myJSONType === 'chord progressions') {
                lilyText += "\\key "+keySignatures[i];
                myLilyBass += "\\key "+keySignatures[i];
            }
            isRest = false;
            isTriplet = false;
//----------------------------------------------------------
            // in a properly formatted array the triplets should come in sets of three in a row.
            if(durations[i].includes('t') ) {
                if(pitchIndex >= pitchesLength) {
                   lilyNote = '';
                   continue;
                }
//                numOfTriplets++;
//                isTriplet = true;

                // start tuplet tag, open curly brace             
                lilyNote = '\\tuplet 3/2 { ';

                tripletNotes = '';
                while(durations[i].includes('t')) {
/*--------------------------------------------------------------
needs work for rests
					if(containsErrorArray) {
						if(errors[errorIndex] == pitchIndex) {
							if(!errorHighlightInProgress) {
								tripletNotes += '\n' + highlightNoteAndStem('#red') + '\n';
								errorHighlightInProgress = true;
							}
							errorIndex++;
						} else {
							if(errorHighlightInProgress) {
								tripletNotes += '\n' + highlightNoteAndStem('#black') + '\n';
								errorHighlightInProgress = false;
							}
						}
					}
//--------------------------------------------------------*/
	                console.log('start triplet i='+i+' pitchIndex='+pitchIndex);
					tripletNotes += ' ' + getLilyLetter(pitches[pitchIndex]); 
	//                tripletNotes += getLilyOctaveMark(pitches[pitchIndex], pitches[pitchIndex-1]);
					tripletNotes += getLilyDuration(durations[i])
					pitchIndex++;
					i++;                
                }
                // move i and pitchIndex back one number
                pitchIndex--;
                i--;

                // close tuplet curly brace
                lilyNote += tripletNotes + ' }';                
                lilyText += ' ' + lilyNote;
                console.log('lilyNote ='+lilyNote+' pitchIndex='+pitchIndex);
                tripletNotes = '';
                pitchIndex++;
                continue;
            }
//------------------------------------------------------------

            if(durations[i].includes('r') ) {
                isRest = true;
            }
            if(!isRest) { // note
                if(pitchIndex >= pitchesLength) {
                   lilyNote = '';
                   continue;
                }
                if(myJSONType === 'interval' || myJSONType === 'melody' || myJSONType === 'ScaleAssignment' ||
                    myJSONType === 'chorale' || myJSONType === 'CPMelody') {
                    if(typeof(pitches[pitchIndex]) == 'string') {
//                        console.log('calling getLilyLetter(): typeof(pitches[pitchIndex])='+typeof(pitches[pitchIndex])) 
					    lilyNote = getLilyLetter(pitches[pitchIndex]);
                    }  else {
//                        console.log('calling getLilyChord(): typeof(pitches[pitchIndex])='+typeof(pitches[pitchIndex])) 
                    	lilyNote = getLilyChord(pitches[pitchIndex]);
                    }

//                    console.log('myJSONType='+myJSONType);
//					lilyNote = getLilyLetter(pitches[pitchIndex]);
//	                console.log('i='+i+' pitchIndex='+pitchIndex+''+' pitches['+pitchIndex+']='+pitches[pitchIndex]+' lilyNote='+lilyNote);

                } else if(myJSONType === 'bluesDiceGame') {
//                    console.log('myJSONType='+myJSONType);
					lilyNote = getLilyLetter(pitches[pitchIndex]);
//	                console.log('i='+i+' pitchIndex='+pitchIndex+''+' pitches['+pitchIndex+']='+pitches[pitchIndex]+' lilyNote='+lilyNote);
                } else if(myJSONType === 'piano' || myJSONType === 'Assignment' || myJSONType === 'pianoCadence') {
                    if(typeof(pitches[pitchIndex]) == 'string') {
//                        console.log('calling getLilyLetter(): typeof(pitches[pitchIndex])='+typeof(pitches[pitchIndex])) 
					    lilyNote = getLilyLetter(pitches[pitchIndex]);
                    }  else {
//                        console.log('calling getLilyChord(): typeof(pitches[pitchIndex])='+typeof(pitches[pitchIndex])) 
                    	lilyNote = getLilyChord(pitches[pitchIndex]);
                    }
                    
                } else if(myJSONType === 'mozartDiceGame') {
                    if(typeof(pitches[pitchIndex]) == 'string') {
//                        console.log('calling getLilyLetter(): typeof(pitches[pitchIndex])='+typeof(pitches[pitchIndex])) 
					    lilyNote = getLilyLetter(pitches[pitchIndex]);
                    }  else {
//                        console.log('calling getLilyChord(): typeof(pitches[pitchIndex])='+typeof(pitches[pitchIndex])) 
                    	lilyNote = getLilyChord(pitches[pitchIndex]);
                    }
                    
                } else if(myJSONType === 'chord') {
//                    console.log('myJSONType='+myJSONType);
                    var chord = pitches[pitchIndex].slice();
//                    var chordLength = chord.length
					lilyNote += getLilyChord(chord, pitches, pitchIndex);

                } else if(myJSONType === 'chord progressions') {
//                    setNewStaffandClef('bass');
                    var chordProg = pitches[pitchIndex].slice();
                    lilyNote += getLilyChordProgression(chordProg, pitches, pitchIndex);
//                    console.log('myJSONType='+myJSONType+' chordProg='+chordProg+' lilyNote='+lilyNote);

                }
                
                if(myJSONType != 'chord progressions') {
					lilyDuration = getLilyDuration(durations[i]);
					if(lilyDuration == undefined) {
                        console.log('durations['+i+']='+durations[i]);
                    }
					if(lilyDuration.includes('~') ) {
						lilyNote = createTiedLilyCode(lilyNote, lilyDuration);
					} else {
						lilyNote += lilyDuration; 
	//                    console.log('i='+i+' pitchIndex='+pitchIndex+' lilyNote ='+lilyNote+' lilyDuration='+lilyDuration)
					}
//                    console.log('i='+i+' pitchIndex='+pitchIndex+' lilyNote ='+lilyNote+' lilyDuration='+lilyDuration)
                }
//                console.log('lilyNote ='+lilyNote);
                pitchIndex++;
            }  else { // rest
                lilyDuration = durationToLilyDuration[durations[i]];
//                console.log('durations['+i+']='+durations[i]+' lilyDuration='+lilyDuration);
                // update lastLilyDuration
                if( lilyDuration !== lastLilyDuration) {
                    lastLilyDuration = lilyDuration;
                }
                lilyNote += lilyDuration;
            }
//            console.log('lilyNote ='+lilyNote+' pitchIndex='+pitchIndex);

            if(containsNoteErrorArray) {
				if( noteErrors[noteErrorIndex] == (pitchIndex-1) ) {
					if (!isRest && !errorNoteHighlightInProgress){
						lilyText += '\n' + highlightNoteAndStem('#red') + '\n';
						errorNoteHighlightInProgress = true;
//                    console.log('Highlight note: isRest='+isRest+' lilyNote='+lilyNote+' noteErrors['+noteErrorIndex+']='+noteErrors[noteErrorIndex]+' i='+i+' pitchIndex='+pitchIndex);
					}
					noteErrorIndex++;
				} else {
					if(!isRest && errorNoteHighlightInProgress) {
						lilyText += '\n' + highlightNoteAndStem('#black') + '\n';
						errorNoteHighlightInProgress = false;
					}		
				}
            
            }
            if(containsRestErrorArray) {
                if(restErrors[restErrorIndex] == i) {
//					if(isRest && !errorRestHighlightInProgress) {    
					if(!errorRestHighlightInProgress) {
					    if(isRest) {
						    lilyText += '\n' + highlightRest('#red') + '\n';
						    restHighlighted = true;
						} else {
						    lilyText += '\n' + highlightNoteAndStem('#red') + '\n';
						    restHighlighted = false;
						}
						errorRestHighlightInProgress = true;
//					console.log('Highlight rest: isRest='+isRest+' lilyNote='+lilyNote+' restErrors['+restErrorIndex+']='+restErrors[restErrorIndex]+' i='+i+' pitchIndex='+pitchIndex)
					}
					restErrorIndex++;
				} else {
					if(errorRestHighlightInProgress) {
					    if(restHighlighted) {
							lilyText += '\n' + highlightRest('#black') + '\n';
							restHighlighted = false;
					console.log('UnHighlight rest: isRest='+isRest+' lilyNote='+lilyNote+' restErrors['+restErrorIndex+']='+restErrors[restErrorIndex]+' i='+i+' pitchIndex='+pitchIndex)
						} else {
						    lilyText += '\n' + highlightNoteAndStem('#black') + '\n';
							restHighlighted = false;
					console.log('UsHighlight rest: isRest='+isRest+' lilyNote='+lilyNote+' restErrors['+restErrorIndex+']='+restErrors[restErrorIndex]+' i='+i+' pitchIndex='+pitchIndex)
						}
						errorRestHighlightInProgress = false;
					}
				}
            }



            lilyText += ' ' + lilyNote;
            
            if(hasSpecialBarline) {
                lilyText += lilySpecialBarline;
                lilySpecialBarline = '';
                hasSpecialBarline = false;
            }
            // we're done, reset to false for next iteration
        }
//        lilyText += ' \\bar "||" }\n';
        lilyText += ' \\bar "|."';
        lilyText += ' }\n';
        return lilyText;
    }

    function createTiedLilyCode(lilyNote, lilyDuration) {
        var arrayOfDurs = lilyDuration.split('~');
        var newLilyCode = "";
        for(let i=0; i<arrayOfDurs.length; i++) {
            if(i>0) {
                newLilyCode += '~ ';
            }
            newLilyCode += lilyNote + arrayOfDurs[i];
        }
        return newLilyCode;
    }

    function getLilyChord(chordString, pitches, pitchIndex) {
        var lilyNote = ' <';
        var lilyLetter;
		for(var j=0; j<chordString.length; j++) {
			lilyLetter = getLilyLetter(chordString[j]);
			lilyNote += " "+ lilyLetter;
/*------------------------------------------------------------
			if(j == 0 && pitchIndex > 0) {
				lilyNote += getLilyOctaveMark(chordString[0], pitches[pitchIndex-1][0])					    

			} else if(j > 0) {
				lilyNote += getLilyOctaveMark(chordString[j], chordString[j-1])
			}
''------------------------------------------------------------*/
		}
		lilyNote += '>';
		return lilyNote;
    }

    
    function getLilyChordProgression(chordProgressionString, pitches, pitchIndex) {
        var lilyChord = "";
        var aLilyChord = "";
        var lilyBass = "";
        var lilyLetter;
//        console.log('chordProgressionString.length='+chordProgressionString.length+'\nchordProgressionString='+chordProgressionString)
        for(var i=0; i<chordProgressionString.length; i++) {
            aLilyChord = getLilyChord(chordProgressionString[i]);
//            console.log('aLilyChord='+aLilyChord);
            lilyBass += getFirstNoteFromLilyChord(aLilyChord);
            lilyChord += ' < ';
            lilyChord += removeFirstNoteFromLilyChord(aLilyChord); // this has the closing '>'
            if(i==0) {   
                lilyChord += ' 1 ';
                lilyBass += ' 1 ';
            }
        }
        lilyBass += ' \\bar "||" ';
        myLilyBass += lilyBass;

        return lilyChord;
    }
    
    function getFirstNoteFromLilyChord(lilyChord) {
//        console.log('getFirstNoteFromLilyChord(): lilyChord='+lilyChord);
        var firstNote;
        var notes = lilyChord.split(' ');
        var i = 0;
        while(notes[i] != '<') {
            i++;
        }
//        console.log('notes['+(i+1)+']= '+notes[i+1]);
        firstNote = ' ' + notes[i+1]; // notes[0] is '<'
        return firstNote;
    }
    
    function removeFirstNoteFromLilyChord(lilyChord) {
//        console.log('removeFirstNoteFromLilyChord():  lilyChord='+lilyChord);
        var remainderChord = "";;
        var notes = lilyChord.split(' ');
//        console.log('notes= '+notes);
        // notes[0] == '<' && notes[1] == firstNote
        var i = 0;
        while(notes[i] != '<') {
            i++;
        }
        i++;
//        console.log('notes['+i+']='+notes[i]);
        for(i++; i<notes.length-1; i++) {
            remainderChord += ' ' + notes[i];
        }
//        console.log('remainderChord= '+remainderChord);
        return remainderChord;
    }
    
    
    function getLilyLetter(pitch_OctaveNumber) {
        if(pitch_OctaveNumber == undefined)
            return;
//        console.log('getLilyLetter(): pitch_OctaveNumber='+pitch_OctaveNumber);
        var letterWithOctave = "";
		var letter = pitch_OctaveNumber.substring(0 , pitch_OctaveNumber.length-1);
		var octaveNumber = pitch_OctaveNumber.substring(pitch_OctaveNumber.length-1);
//        console.log('pitch_OctaveNumber='+pitch_OctaveNumber+' letter='+letter);
        letterWithOctave = pitchToLilyPitch[letter];
        letterWithOctave += octaveToLilyOctave[octaveNumber]
		return letterWithOctave;
    }

    function getLilyDuration(duration) {
		var lilyDuration = durationToLilyDuration[duration];
//		console.log('getLilyDuration((): duration='+duration+' lilyDuration='+lilyDuration+' lastLilyDuration='+lastLilyDuration);
		if(lilyDuration !== lastLilyDuration) {
			lastLilyDuration = lilyDuration;
		}  else if(!lilyDuration.includes('r')) {
			lilyDuration = '';
		}
        return lilyDuration
    }

    function getLilyStartRelativeCode(pitchAndOctave) {
//        console.log( 'typeof(pitchAndOctave) ='+typeof(pitchAndOctave));
        if(typeof(pitchAndOctave) === 'string') {
			var pitch = pitchAndOctave.substring(0 , pitchAndOctave.length-1);
			var startingOctave = pitchAndOctave.substring(pitchAndOctave.length-1, pitchAndOctave.length);
			var lilyCode = '\\relative ' + pitchToLilyPitch[pitch];        
			lilyCode += octaveToLilyOctave[startingOctave];
			return lilyCode;
        } else if(typeof(pitchAndOctave) === 'object') {
//            console.log('pitchAndOctave[0]='+pitchAndOctave[0])
            var pitch, startingOctave;
            if(typeof(pitchAndOctave[0]) === 'object') {
                pitch = pitchAndOctave[0][0].substring(0 , pitchAndOctave[0][0].length-1);
			    startingOctave = pitchAndOctave[0][0].substring(pitchAndOctave[0][0].length-1, pitchAndOctave[0][0].length);
            } else if(typeof(pitchAndOctave[0]) === 'string') {
			    pitch = pitchAndOctave[0].substring(0 , pitchAndOctave[0].length-1);
			    startingOctave = pitchAndOctave[0].substring(pitchAndOctave[0].length-1, pitchAndOctave[0].length);
			}
			var lilyCode = '\\relative ' + pitchToLilyPitch[pitch];        
			lilyCode += octaveToLilyOctave[startingOctave];
			return lilyCode;        
        }
    }

    var octaveToLilyOctave = {
        "0": ",,,",
        "1": ",,",
        "2": ",",
        "3": "",
        "4": "'",
        "5": "''",
        "6": "'''",
        "7": "''''",
        "8": "'''''",        
    }
    
    var lilyOctaveToOctaveNumber = {
        ",,,": "0",
        ",,": "1",
        ",": "2",
        "": "3",
        "'": "4",
        "''": "5",
        "'''": "6",
        "''''": "7",
        "'''''": "8"        
    }

    var lilyOctaveToOctaveChange = {
        ",,,": -3,
        ",,": -2,
        ",": -1,
        "": 0,
        "'": 1,
        "''": 2,
        "'''": 3,
        "''''": 4,
        "'''''": 5        
    }
    
    
    var offsetFromC = {
        'C': 0, 'C#': 0, 'Cb': 0,
        'D': 1, 'D#': 1, 'Db': 1,
        'E': 2, 'E#': 2, 'Eb': 2,
        'F': 3, 'F#': 3, 'Fb': 3,
        'G': 4, 'G#': 4, 'Gb': 4,
        'A': 5, 'A#': 5, 'Ab': 5,
        'B': 6, 'B#': 6, 'Bb': 6
    }
    
    
    var octaveToLilyCode = {
         '0': '\\relative c,,,',
         '1': '\\relative c,,',
         '2': '\\relative c,',
         '3': '\\relative c ',
         '4': '\\relative c\' ',
         '5': '\\relative c\'\' ',
         '6': '\\relative c\'\'\' ',
         '7': '\\relative c\'\'\'\' ',
         '8': '\\relative c\'\'\'\'\' ' 
    }
    
    
    function getLilyOctaveMark(pitchAndOctave, pitchAndOctavePrev) {
        var octaveMarkCounter = 0;
        var octaveMark = "";
        var pitch = pitchAndOctave.substring(0 , pitchAndOctave.length-1);
        var octave = pitchAndOctave.substring(pitchAndOctave.length-1, pitchAndOctave.length);
        var pitchPrev = pitchAndOctavePrev.substring(0 , pitchAndOctavePrev.length-1);
        var octavePrev = pitchAndOctavePrev.substring(pitchAndOctavePrev.length-1, pitchAndOctavePrev.length);
        var octaveDiff = octave - octavePrev;
        var pitchOffset = offsetFromC[pitch] - offsetFromC[pitchPrev];

        if(pitchOffset < 0) {
            if(Math.abs(pitchOffset) > 3) {
                octaveMarkCounter = octaveMarkCounter-1;
            }
            pitchOffset = pitchOffset+7
        } else if(pitchOffset > 3) {
            if(octaveDiff === 0) {
                octaveMarkCounter = octaveMarkCounter+1;
            }
        }
        
        if(pitchOffset < 4) { // normally ascending
            if(octaveDiff === 0) { // ascending
                if( pitchPrev.includes('B') && pitchOffset == 3 ) {
                    octaveMark = ",";                
//                    octaveMarkCounter = octaveMarkCounter-1;
                } else {
                    octaveMark = "";
                }
            } else if(octaveDiff > 0) { // needs an up octave mark
                if(!pitchPrev.includes('B') && (!(pitchPrev.includes('A') && pitchOffset>1)) &&
                    (!(pitchPrev.includes('G') && pitchOffset>2)) ) {
                        octaveMark = "'";
//                        octaveMarkCounter = octaveMarkCounter+1;
                    }
            } else if(octaveDiff < 0) { // needs a down octave mark
                octaveMark = ",";
//                octaveMarkCounter = octaveMarkCounter-1;
            }
        } else {  // normally descending
            if(octaveDiff === 0) { // descending
                octaveMark = "";
            } else if(octaveDiff > 0) { // needs an up octave mark
                octaveMark = "'";
//                octaveMarkCounter = octaveMarkCounter+1;
            } else if(octaveDiff < 0) { // needs a down octave mark
                if(!pitchPrev.includes('C') && (!(pitchPrev.includes('D') && pitchOffset<6)) &&
                    (!(pitchPrev.includes('E') && pitchOffset<5)) ) {
                    octaveMark = ",";
//                    octaveMarkCounter = octaveMarkCounter-1;
                } else {
                    octaveDiff++;
                }
            }
        }
        octaveMarkCounter = octaveMarkCounter+octaveDiff;
        octaveMark = translateNumberToLilyOctaveMarker[octaveMarkCounter];
        
//        console.log('pitchAndOctave='+pitchAndOctave+' pitchAndOctavePrev='+pitchAndOctavePrev+' pitchOffset='+pitchOffset+' octaveDiff='+octaveDiff+' octaveMarkCounter='+octaveMarkCounter);
        return octaveMark;
    }

	var translateNumberToLilyOctaveMarker = {
	    "0": "",
	    "-2": ",,",
	    "-1": ",",
	    "1": "'",
	    "2": "''"
	};
	
	
	
    function setNotesAndDurations(notes, durations) {
//        console.log('setNotesAndDurations(); notes='+notes);
        myNotes = notes.slice();
        myDurations = durations.slice();
    }

    function setMelody(melody) {
        var notes = [];
        var durs = [];
        for(let i=0; i<melody.length; i++) {
//            console.log('melody[i]='+melody[i]+' melody[i].note='+melody[i].note+' melody[i].duration='+melody[i].duration)
            notes.push(melody[i].note);
            durs.push(melody[i].duration);
        }
//        console.log('notes='+notes+' notes.length='+notes.length);
//        console.log('durs='+durs+' durs.length='+durs.length);
        setNotesAndDurations(notes, durs);
    }

/**
 * this sets the score values on the lilyPondAdapter object
 * @param {object} json 
 * @returns nothing
 * @example
 * // an example of the json parameter
 * var jsonConfig = {
 *	    "jsonType": "ScaleAssignment",
 *		"keySig": "c \\major",
 *		"clef": "treble",
 *		"timeSig": "4/4",
 *		"title": "Assignment",
 *		"name": "Assignment on "+timeStamp,
 *		"notes": notes,
 *		"durations": durations,
 *		"pickup": "",
 *		"pickupLength": "",
 *		"tempo": ' \"moderato\" 4 = 90',
 *		"opus": assignmentNumber,
 *		"composer": studentName
 * };
 * lpAdapter.setScoreParameters(jsonConfig);
 */
    function setScoreParameters(json) {
        myJSONType = json.jsonType? json.jsonType: 'interval';
        setNotesAndDurations(json.notes, json.durations);
        setKeySignatures(json.keySig);
        setRomanNumerals(json.romanNumerals)
        setTimeSignature(json.timeSig);
        setClef(json.clef);
        setTempo(json.tempo);
        setName(json.name);
        setBarlines(json.barlines);
        setChords(json.chords);
        setDiceClef(json.diceStaff);
        setPickupMeasureLength(json.pickupLength);
        setPickupMeasure(json.pickup, json.pickupLength);
        setComposer(json.composer);
        setOpus(json.opus);
    }
    
    function setDiceClef(diceStaff) {        
        myDiceStaff = diceStaff? diceStaff: '';
    }
    function setTimeSignature(time) {        
        myTimeSignature = time? time: '4/4';
    }
    function setKeySignatures(key) {
        myKeySignatures = key? key: ['c \\major','c \\major','c \\major','c \\major','c \\major'];
//        console.log('myKeySignatures='+myKeySignatures)
    }
    function setRomanNumerals(num) {
        myRomanNumerals = num? num: ['','','','',''];
    }
    function setPickupMeasureLength(pickupLen) {
//        console.log('setPickupMeasureLength(): pickupLen='+pickupLen);
        myPickupMeasureLength = pickupLen? getLilyDuration(pickupLen): '';
    }
    function setPickupMeasure(pickupMeasure, pickupLen) {
        myPickupMeasure = pickupMeasure? pickupMeasure: '';
        // if the pickup notes were note passed in then get them from myNotes
        if(myPickupMeasure == "" && pickupLen !== '') {
            // calculate the pickup notes and recalculate the notes array
            console.log('typeof(myNotes)='+typeof(myNotes));
            myPickupMeasure = calcPickupNotes(pickupLen, myNotes, myDurations);
        }
    }
    function setClef(clef) {
        myClef = clef? clef: 'treble';
    }    
    function setNewStaffandClef(clef) {
        myNewStaffAndClef = clef? clef: 'bass';
        newStaffAndClef = true;
    }
    function setTempo(tempo) {
        myTempo = tempo? tempo: '4 = 60';
    }
    function setName(name) {
        myFileName = name? name: 'untitled';
    }
    function setChords(chords) {
        myChords = chords? chords: '';
    }
    function setComposer(composer) {   
        myComposer = composer? composer: '';
    }
    function setOpus(opus) {        
        myOpus = opus? opus: '';
    }


    function setBarlines(barlines) {
        myBarlines = barlines? barlines: '';
    }
    // myBarlines is a nested array in the following form
    //  [ [12,'\bar "||"'], [24,'\bar "|."'] ]
    // this sets a double bar at bar 12 and a final double bar at bar 24
    // all other calls with different measureNum return ''
    // it would be best if this wasn't called unnessarily
    // so an array of measure number (each myBarlines[i][0])
    // is created getBarlineMeasureNumbers()
    function getBarline(measureNum) {
        for(let i=0; i<myBarlines.length; i++) {
            if(measureNum == myBarlines[i][0]) {
                 return myBarlines[i][1];
            }
        }
        return '';
    }
    function getBarlineMeasureNumbers() {
        var measureNumbers = [];
        for(let i=0; i<myBarlines.length; i++) {
            measureNumbers.push(myBarlines[i][0]);
        }
        return measureNumbers;
    }

    function getRomanNumerals() {
        var romanNums = '';;
        for(var i=0; i<myRomanNumerals.length; i++) {
            romanNums += ' '+ myRomanNumerals[i];
        }
        return romanNums;
    }
    function getTimeSignatureNumericTotal() {
        return calcMeterNumericTotal();
    }
    function calcMeterNumericTotal() {
        var numericTotal = 0;
        var meter = myTimeSignature.slice();
//        console.log('meter='+meter);
        var noteType = ''
        var beatsPerBar = 0;
        var numericPerBeat = 0;
        // myTimeSignature is a string in the form: 3/4
        // use split('/')
        var temp = meter.split('/');
        // then change string into Number
        beatsPerBar = Number(temp[0]);
        noteType = temp[1];
        // translate the bottom number (noteType) into a numericValue (24 PPQ)
        numericPerBeat = NoteTypeToNumeric[noteType];
        // multiply that result by the top number
        numericTotal = numericPerBeat * beatsPerBar;
//        console.log('numericTotal='+numericTotal+' numericPerBeat='+numericPerBeat+' * beatsPerBar='+beatsPerBar)
        // return result
        return numericTotal;
    }
    
    var NoteTypeToNumeric = {
        '16': 6, '8': 12, 
        '4': 24, '2': 48
    }
    function calcPickupNotes(pickupLength, noteArray, durArray) {
        var lilyPickup = '';
        var myPitchIndex = 0;
        var index=0;
        var currentDuration = '';
        var currentLilyDuration = '';        
        var currentLilyPitch = '';
        var runningTotal = 0;
        var firstNotePlayed = false;
        var pickupTotal = Math.abs(rhythmTextToNumbers[pickupLength]);
//        console.log('pickupLength='+pickupLength+' pickupTotal='+pickupTotal)
        
        for(index=0; index<durArray.length; index++) {
            currentLilyDuration = '';
            currentLilyPitch = '';

            // look at each duration, 
            currentDuration = durArray[index];
        
            // if it's a rest duration 
            if(currentDuration.includes('r')) {
                // add duration to runningTotal compare to pickupLength
                runningTotal += Math.abs(rhythmTextToNumbers[currentDuration]);
//                console.log('currentDuration='+currentDuration+' runningTotal='+runningTotal)
                currentLilyDuration = getLilyDuration(currentDuration);
                lilyPickup += ' '+currentLilyDuration;
//                console.log('currentDuration='+currentDuration+' runningTotal='+runningTotal+' currentLilyDuration='+currentLilyDuration)

				if(runningTotal >= pickupTotal) {
					break;
				}            
            } else { // it's a note duration
                // use noteArray to get the lilyLetter
                console.log('typeof(noteArray[myPitchIndex])==object) ='+(typeof(noteArray[myPitchIndex]) == 'object') );
                if(typeof(noteArray[myPitchIndex]) == 'string') {
                    console.log('typeof(noteArray['+myPitchIndex+'])='+typeof(noteArray[myPitchIndex])+' noteArray['+myPitchIndex+']='+noteArray[myPitchIndex] );
                    currentLilyPitch = getLilyLetter(noteArray[myPitchIndex]);
                } else if(typeof(noteArray[myPitchIndex]) == 'object') {
                    console.log('typeof(noteArray['+myPitchIndex+'])='+typeof(noteArray[myPitchIndex])+' noteArray['+myPitchIndex+'][0]='+ noteArray[myPitchIndex][0] );
  
				    if(typeof(noteArray[myPitchIndex][0]) == 'string') {
					    console.log('typeof(noteArray['+myPitchIndex+'][0])='+typeof(noteArray[myPitchIndex][0])+' noteArray['+myPitchIndex+'][0]='+noteArray[myPitchIndex][0] );
					    currentLilyPitch = getLilyLetter(noteArray[myPitchIndex][0]);
					} else if(typeof(noteArray[myPitchIndex][0]) == 'object') {
					    console.log('typeof(noteArray['+myPitchIndex+'][0])='+typeof(noteArray[myPitchIndex][0])+' noteArray['+myPitchIndex+'][0][0]='+ noteArray[myPitchIndex][0][0] );
					    currentLilyPitch = getLilyLetter(noteArray[myPitchIndex][0][0]);                
					}
                }
                
                myPitchIndex++;
//                firstNotePlayed = true;
                // use durArray to get the lilyduration
                currentLilyDuration = getLilyDuration(currentDuration);

                // add them to lilyPickup
                lilyPickup += ' '+currentLilyPitch+currentLilyDuration;
                runningTotal += Math.abs(rhythmTextToNumbers[currentDuration]);
				if(runningTotal >= pickupTotal) {
					break;
				}           
            }
//            console.log('runningTotal='+runningTotal+' pickupTotal='+pickupTotal);
        }
//        console.log('myPitchIndex='+myPitchIndex+' index='+index);
        
//        console.log('noteArray='+noteArray);
        var myNewNotes = noteArray.slice(myPitchIndex);
//        console.log('myNewNotes='+myNewNotes);
        var myNewDurations = durArray.slice(index+1);
        setNotesAndDurations(myNewNotes, myNewDurations);
        return lilyPickup;
    }

/**
 * this sets the score values on the lilyPondAdapter object
 * @param {object} json 
 * @returns nothing
 * @example
 * // after the auto generated melody is created the following
 * // json is created as a parameter.
 * var jsonConfig = {
 *   "jsonType": "CPMelody",
 *	 "keySig": keySig,
 *	 "clef": clef,
 *	 "timeSig": timeSig,
 *	 "title": title,
 *	 "name": title+" on "+timeStamp,
 *	 "notes": notes,
 *	 "durations": durations,
 *	 "notes2": notes2,
 *	 "durations2": durations2,
 *	 "diceStaff": myOrnStaff,
 *	 "pickup": pickup,
 *	 "pickupLength": "",
 *	 "tempo": tempo
 * };
 * lpAdapter.setCPMelodyParameters(jsonConfig);
 */
    function setCPMelodyParameters(json) {
        myJSONType = json.jsonType? json.jsonType: 'CPMelody';
        setNotesAndDurations(json.notes, json.durations);
        setNotesAndDurations2(json.notes2, json.durations2);
        setKeySignatures(json.keySig);
//        setRomanNumerals(json.romanNumerals)
        setTimeSignature(json.timeSig);
        setClef(json.clef);
        setTempo(json.tempo);
        setName(json.name);
        setBarlines(json.barlines);
        setChords(json.chords);
        setName(json.title);
        setDiceClef(json.diceStaff)

        setPickupMeasureLength(json.pickupLength);
        setPickupMeasure(json.pickup, json.pickupLength);
        setComposer(json.composer);
        setOpus(json.opus);
    }


/**
 * this sets the chorale score values on the lilyPondAdapter object
 * @param {object} json 
 * @returns nothing
 * @example 
 * // example of json parameter for 4-part chorale
 * var jsonConfig = {
 *   "jsonType": "chorale",
 *   "keySig": keySig,
 *   "clef": clef,
 *   "timeSig": timeSig,
 *   "title": title,
 *   "name": title+" on "+timeStamp,
 *   "notes1": voicesNotesAndDurations[0][0].slice(),
 *   "durations1": voicesNotesAndDurations[0][1].slice(),

 *   "notes2": voicesNotesAndDurations[1][0].slice(),
 *   "durations2": voicesNotesAndDurations[1][1].slice(),

 *   "notes3": voicesNotesAndDurations[2][0].slice(),
 *   "durations3": voicesNotesAndDurations[2][1].slice(),

 *   "notes4": voicesNotesAndDurations[3][0].slice(),
 *   "durations4": voicesNotesAndDurations[3][1].slice(),

 *   "pickup": pickup,
 *   "pickupLength": "",
 *   "tempo": tempo
 * };
 * lpAdapter.setChoraleScoreParameters(jsonConfig);
 */
    function setChoraleScoreParameters(json) {
        myJSONType = json.jsonType? json.jsonType: 'chorale';
        setNotesAndDurations(json.notes1, json.durations1);
        setNotesAndDurations2(json.notes2, json.durations2);
        if(myJSONType === 'chorale') {
          setNotesAndDurations3(json.notes3, json.durations3);
          setNotesAndDurations4(json.notes4, json.durations4);
        }
        setKeySignatures(json.keySig);
        setRomanNumerals(json.romanNumerals)
        setTimeSignature(json.timeSig);
        setClef(json.clef);
        setTempo(json.tempo);
        setName(json.name);
        setBarlines(json.barlines);
        setChords(json.chords);
//        setName(json.title);

        setPickupMeasureLength(json.pickupLength);
        setPickupMeasure(json.pickup, json.pickupLength);
        setComposer(json.composer);
        setOpus(json.opus);
    }
    
    

//----------------- Grand staff -----------------
/**
 * this sets the grand staff score values on the lilyPondAdapter object
 * @param {object} json1 
 * @param {object} json2 
 * @returns nothing
 * @example 
 * // example of json parameter for grand staff score
 * var json conFig = {
 *   "jsonType": "pianoCadence",
 *   "keySig": keySig,
 *   "clef": clef,
 *   "timeSig": timeSig,
 *   "title": title,
 *   "name": title+" on "+timeStamp,
 *   "notes1": LeftRightNotesAndDurations[0][0].slice(),
 *   "durations1": LeftRightNotesAndDurations[0][1].slice(),
 *   "notes2": LeftRightNotesAndDurations[1][0].slice(),
 *   "durations2": LeftRightNotesAndDurations[1][1].slice(),
 *   "pickup": pickup,
 *   "pickupLength": "",
 *   "tempo": tempo,
 *   "opus": assignmentNumber,
 *   "composer": studentName
 * }


 */
    function setGrandStaffScoreParameters(json1, json2) {
        myJSONType = json1.jsonType? json1.jsonType: 'grandStaff';
        setNotesAndDurations(json1.notes, json1.durations);
        setKeySignatures(json1.keySig);
        setRomanNumerals(json1.romanNumerals)
        setTimeSignature(json1.timeSig);
        setClef(json1.clef);
        setTempo(json1.tempo);
        setName(json1.name);
        setBarlines(json1.barlines);
        setChords(json1.chords);
        setComposer(json1.composer);
        setOpus(json1.opus);

        setPickupMeasureLength(json1.pickupLength);
        setPickupMeasure(json1.pickup, json1.pickupLength);


        myJSONType2 = json2.jsonType? json2.jsonType: 'grandStaff';
        setNotesAndDurations2(json2.notes, json2.durations);
        setKeySignatures2(json2.keySig);
        setRomanNumerals2(json2.romanNumerals)
        setTimeSignature2(json2.timeSig);
        setClef2(json2.clef);
        setTempo2(json2.tempo);
        setName2(json2.name);
//        setBarlines2(json2.barlines);
        setPickupMeasureLength2(json2.pickupLength);
        setPickupMeasure2(json2.pickup, json2.pickupLength);
        setDiceClef(json2.diceStaff);

    }

//----------------- bass clef part -----------------
    function setNotesAndDurations2(notes, durations) {
//        console.log('setNotesAndDurations2(); notes='+notes);
        myNotes2 = notes.slice();
        myDurations2 = durations.slice();
    }

    function setNotesAndDurations3(notes, durations) {
//        console.log('setNotesAndDurations3(); notes='+notes);
        myNotes3 = notes.slice();
        myDurations3 = durations.slice();
    }

    function setNotesAndDurations4(notes, durations) {
//        console.log('setNotesAndDurations4(); notes='+notes);
        myNotes4 = notes.slice();
        myDurations4 = durations.slice();
    }

    function setMelody2(melody) {
        var notes = [];
        var durs = [];
        for(let i=0; i<melody.length; i++) {
//            console.log('melody[i]='+melody[i]+' melody[i].note='+melody[i].note+' melody[i].duration='+melody[i].duration)
            notes.push(melody[i].note);
            durs.push(melody[i].duration);
        }
//        console.log('notes='+notes+' notes.length='+notes.length);
//        console.log('durs='+durs+' durs.length='+durs.length);
        setNotesAndDurations2(notes, durs);
    }

    function setTimeSignature2(time) {        
        myTimeSignature2 = time? time: '4/4';
    }
    function setKeySignatures2(key) {
        myKeySignatures2 = key? key: ['c \\major','c \\major','c \\major','c \\major','c \\major'];
//        console.log('myKeySignatures2='+myKeySignatures2)
    }
    function setRomanNumerals2(num) {
        myRomanNumerals2 = num? num: ['','','','',''];
    }
    function setPickupMeasureLength2(pickupLen) {
//        console.log('setPickupMeasureLength2(): pickupLen='+pickupLen);
        myPickupMeasureLength2 = pickupLen? getLilyDuration(pickupLen): '';
    }
    function setPickupMeasure2(pickupMeasure, pickupLen) {
        myPickupMeasure2 = pickupMeasure? pickupMeasure: '';
        // if the pickup notes were note passed in then get them from myNotes
        if(myPickupMeasure2 == "" && pickupLen !== '') {
            // calculate the pickup notes and recalculate the notes array
            myPickupMeasure2 = calcPickupNotes(pickupLen, myNotes2, myDurations2);
        }
    }
    function setClef2(clef) {
        myClef2 = clef? clef: 'treble';
    }    
    function setNewStaffandClef2(clef) {
        myNewStaffAndClef2 = clef? clef: 'bass';
        newStaffAndClef = true;
    }
    function setTempo2(tempo) {
        myTempo2 = tempo? tempo: '4 = 60';
    }
    function setName2(name) {
        myFileName2 = name? name: 'untitled';
    }
    function setBarlines2(barlines) {
        myBarlines2 = barlines? barlines: '';
    }
//-------------------------------------------



	var rhythmTextToNumbers = {
		"1n" : 96, 
		"d2n" : 72, "8n+2n": 60,  "2n+8n": 60, "2n" : 48, "2t" : 32,
		"d4n" : 36, "4n" : 24, "4t" :  16,
		"4n+8n": 36, "8n+4n": 36,
		"d8n" : 18, "8n" : 12, "8t" : 8,
		"d16n" : 9, "16n" : 6, "16t" : 4,
	
	    
	
		"1nr" : -96, 
		"d2nr" : -72, "2nr+4nr": -72, "2nr" : -48,
		"d4nr" : -36, "4nr" : -24,
		"d8nr" : -18, "8nr" : -12,
		"d16nr" : -9, "16nr" : -6,

		"1r" : -96, 
		"d2r" : -72, "2r" : -48, "2tr" : -32,
		"d4r" : -36, "4r" : -24, "4tr" :  -16,
		"d8r" : -18, "8r" : -12, "8tr" : -8,
		"d16r" : -9, "16r" : -6, "16tr" : -4
	};
	
	
    

/**
 * this function creates a lilypond file using the prevously save data
 * @param {boolean} evaluateBool true includes an evaluation of the score compared to the correct answer
 * @returns {string} the lilypond file
 */
function createLilyPondFile(evaluateBool) {
//        console.log('createLilyPondFile() myNotes='+myNotes+' errorIndexArray='+errorIndexArray);
        var errors = (errorIndexArray !== undefined )? errorIndexArray: undefined;
//        console.log('errors='+errors);
        if( errors !== undefined && errors.length !== 0 ) {
            errors = (errorIndexArray[0].length !== 0 || errorIndexArray[1].length !== 0 )? errorIndexArray: undefined;
        }
        var errors2 = (errorIndexArray2 !== undefined )? errorIndexArray2: undefined;
//        console.log('errors2='+errors2);
        if( errors2 !== undefined && errors2.length !== 0 ) {
            errors2 = (errorIndexArray2[0].length !== 0 || errorIndexArray2[1].length !== 0 )? errorIndexArray2: undefined;
        }
        var partialTag = '';
        var fileContent = basicHeader();
 
        // chorale has it's own format
        if(myJSONType === 'chorale') {
            fileContent += makeLilyScore();
            return fileContent;
        }
        
        if(myChords != '') {
			fileContent += '\nmyChords = '+ myChords;        
        }
        fileContent += '\nmyMelody = ';
//        console.log('myNotes='+myNotes+' errors='+errors);
//        console.log('evaluateBool='+evaluateBool+' errors='+errors);
        if(evaluateBool) {
            fileContent += makeLilyNotes(myNotes, myDurations, myKeySignatures, myRomanNumerals, errors);
        } else {
            fileContent += makeLilyNotes(myNotes, myDurations, myKeySignatures, myRomanNumerals);
        }

        if(myJSONType === 'chord progressions') {
            fileContent += '\nmyBass = {' + myLilyBass +' }\n';
            fileContent += '\nmyRomanNumerals = \\lyricmode {' + getRomanNumerals() + ' }\n';

        } else if(myJSONType === 'piano' || myJSONType === 'pianoCadence') {
			fileContent += '\nmyBass = \n';
			fileContent += makeLilyNotes(myNotes2, myDurations2, myKeySignatures, myRomanNumerals, errors2);

        } else if(myJSONType === 'CPMelody') {
			fileContent += '\nmyContourMelody = \n';
			fileContent += makeLilyNotes(myNotes2, myDurations2, myKeySignatures, myRomanNumerals, errors2);
			fileContent += myDiceStaff;

        } else if(myJSONType === 'mozartDiceGame') {
			fileContent += '\nmyBass = \n';
			fileContent += makeLilyNotes(myNotes2, myDurations2, myKeySignatures, myRomanNumerals);
			fileContent += myDiceStaff;
        } else if(myJSONType === 'bluesDiceGame') {
			fileContent += myDiceStaff;
        }
        fileContent += makeLilyScore();
        // clear this global for the next time
        myLilyBass = "";
        errorIndexArray = [];
        errorIndexArray2 = [];
        return fileContent
    }
    
    function basicHeader() {
        var header = '%{ \n '+ myFileName + ' \n';
        header += '%} \n';
        header += '\\version "2.18.2"\n';
        header += '\\header { \n  title = \"'+myFileName+'\"\n';
        header += 'composer = "'+myComposer+'"\n  opus = "'+myOpus+'"\n}\n';
        return header;
    }

    function makeMozartDiceGameScore() {
        var scoreMozart = '';
		scoreMozart += '\n\\new PianoStaff <<\n';
		scoreMozart += '\\set PianoStaff.instrumentName = #"Piano"\n';

		scoreMozart += '\\new Staff = "upper"  { \\clef \"treble\" \n';
		scoreMozart += '\\key ' + myKeySignatures + '\n';
		scoreMozart += '\\time ' + myTimeSignature + '\n';
		scoreMozart += '\\tempo ' + myTempo + '\n';            
		scoreMozart += '\\myMelody\n';
		scoreMozart += '\n}\n';
		
		scoreMozart += '\\new Staff = "lower" { \\clef \"bass\" \n';
		scoreMozart += '\\key ' + myKeySignatures + '\n';
		scoreMozart += '\\time ' + myTimeSignature + '\n';
		scoreMozart += '\\tempo ' + myTempo + '\n';
		scoreMozart += '\\myBass\n';
		scoreMozart += '\n}\n';

		scoreMozart += '\\new Staff { \n';
		scoreMozart += '\\stopStaff \n';
		scoreMozart += '\\time 3/4 \n';
		scoreMozart += '\\hide Staff.TimeSignature \n';
		scoreMozart += '\\hide Staff.Clef \n';
		scoreMozart += '\\myDice \n';
		scoreMozart += '\n}\n';
		scoreMozart += '>>\n';
		return scoreMozart;
    }
    
    function makePianoScore() {
        var scorePiano = '';
		scorePiano += '\n\\new PianoStaff <<\n';
		scorePiano += '\\set PianoStaff.instrumentName = #"Piano"\n';

		scorePiano += '\\new Staff = "upper"  { \\clef \"treble\" \n';
		scorePiano += '\\key ' + myKeySignatures + '\n';
		scorePiano += '\\time ' + myTimeSignature + '\n';
		scorePiano += '\\tempo ' + myTempo + '\n';            
		scorePiano += '\\myMelody\n';
		scorePiano += '\n}\n';
		
		scorePiano += '\\new Staff = "lower" { \\clef \"bass\" \n';
		scorePiano += '\\key ' + myKeySignatures + '\n';
		scorePiano += '\\time ' + myTimeSignature + '\n';
		scorePiano += '\\tempo ' + myTempo + '\n';
		scorePiano += '\\myBass\n';
		scorePiano += '\n}\n';
		scorePiano += '>>\n';
		return scorePiano;
    }
    

    function makeCPMelodyScore() {
        var scoreCPMelody = '';
		scoreCPMelody += '\n\\new PianoStaff <<\n';
		scoreCPMelody += '\\set PianoStaff.instrumentName = #"Piano"\n';

		scoreCPMelody += '\\new Staff = "upper"  { \\clef \"treble\" \n';
		scoreCPMelody += '\\key ' + myKeySignatures + '\n';
		scoreCPMelody += '\\time ' + myTimeSignature + '\n';
		scoreCPMelody += '\\tempo ' + myTempo + '\n';            
		scoreCPMelody += '\\myContourMelody\n';
		scoreCPMelody += '\n}\n';
		
		scoreCPMelody += '\\new Staff = "lower" { \\clef \"treble\" \n';
		scoreCPMelody += '\\key ' + myKeySignatures + '\n';
		scoreCPMelody += '\\time ' + myTimeSignature + '\n';
		scoreCPMelody += '\\tempo ' + myTempo + '\n';
		scoreCPMelody += '\\myMelody\n';
		scoreCPMelody += '\n}\n';

//------------
		scoreCPMelody += '\\new Staff { \n';
		scoreCPMelody += '\\stopStaff \n';
//		scoreCPMelody += '\\time 4/4 \n'; // already default
		scoreCPMelody += '\\hide Staff.TimeSignature \n';
		scoreCPMelody += '\\hide Staff.Clef \n';
		scoreCPMelody += '\\myOrnaments \n';
		scoreCPMelody += '\n}\n';

//---------------*/


		scoreCPMelody += '>>\n';
		return scoreCPMelody;
    }



    function makeChordProgressScore() {
        var scoreChordProgression = '';
		scoreChordProgression += '\n\\new PianoStaff {\n';
		scoreChordProgression += '<<\n';
		scoreChordProgression += '\\new Staff \\new Voice = \"treble\" {\n';
		scoreChordProgression += '\\clef \"treble\"\n';        

		scoreChordProgression += '\\key ' + myKeySignatures + '\n';
		scoreChordProgression += '\\time ' + myTimeSignature + '\n';
		scoreChordProgression += '\\tempo ' + myTempo + '\n';
		scoreChordProgression += '\\myMelody\n';

		scoreChordProgression += '\n}\n';
		scoreChordProgression += '\\new Staff \\new Voice = \"bass\" {\n';
		scoreChordProgression += '\\clef \"bass\"\n';
		scoreChordProgression += '\\myBass\n}\n';
		// roman numerals
		scoreChordProgression += '\\new Lyrics \\lyricsto "bass" { \\myRomanNumerals }\n';
		scoreChordProgression += '>>\n';
		scoreChordProgression += '\n}\n';
        return scoreChordProgression;
    }
    
    function makeBasicScore() {			
        var scoreBasic = '';
        scoreBasic += '\n\\new Staff {\n';
		scoreBasic += '\\clef "' + myClef + '"\n';        
		scoreBasic += '\\key ' + myKeySignatures + '\n';
		scoreBasic += '\\time ' + myTimeSignature + '\n';
		scoreBasic += '\\tempo ' + myTempo + '\n';
		scoreBasic += '\\myMelody\n';
		scoreBasic += '\n}\n';
		return scoreBasic;
	}
    
    function makeBluesDiceGameScore() {			
        var scoreBlues = '';
		scoreBlues += '\n<<\n';
		scoreBlues += '{ \\myChords }\n';
        scoreBlues += '\n\\new Staff {\n';
		scoreBlues += '\\clef "' + myClef + '"\n';        
		scoreBlues += '\\key ' + myKeySignatures + '\n';
		scoreBlues += '\\time ' + myTimeSignature + '\n';
		scoreBlues += '\\tempo ' + myTempo + '\n';
		scoreBlues += '\\myMelody\n';
		scoreBlues += '\n}\n';
		
         
		scoreBlues += '\\new Staff { \n';
		scoreBlues += '\\stopStaff \n';
//		scoreBlues += '\\time 4/4 \n'; // already default
		scoreBlues += '\\hide Staff.TimeSignature \n';
		scoreBlues += '\\hide Staff.Clef \n';
		scoreBlues += '\\myDice \n';
		scoreBlues += '\n}\n';
		scoreBlues += '>>\n';
		return scoreBlues;
	}

    function makeLilyScore() {
        var score = '';
        if(myJSONType === 'chord progressions') {
        // this should be refactored into it's own function
            // hasn't been tested yet
            score += makeChordProgressScore();
            /*---------------------------------------------
            score += '\n\\new PianoStaff {\n';
            score += '<<\n';
			score += '\\new Staff \\new Voice = \"treble\" {\n';
			score += '\\clef \"treble\"\n';        

            score += '\\key ' + myKeySignatures + '\n';
            score += '\\time ' + myTimeSignature + '\n';
            score += '\\tempo ' + myTempo + '\n';
            score += '\\myMelody\n';

            score += '\n}\n';
			score += '\\new Staff \\new Voice = \"bass\" {\n';
			score += '\\clef \"bass\"\n';
			score += '\\myBass\n}\n';
			// roman numerals
			score += '\\new Lyrics \\lyricsto "bass" { \\myRomanNumerals }\n';
//			score += '\\addlyrics { \\myRomanNumerals }\n';
			score += '>>\n';
            score += '\n}\n';
            //----------------------------------------------*/

        } else if(myJSONType === 'piano' || myJSONType === 'pianoCadence') {
            score += makePianoScore();
                
        } else if(myJSONType === 'mozartDiceGame') {
            score += makeMozartDiceGameScore();
        
        } else if(myJSONType === 'CPMelody') {
            score += makeCPMelodyScore();
        
        } else if(myJSONType === 'bluesDiceGame') {
//            console.log('myJSONType ==='+myJSONType)
            score += makeBluesDiceGameScore();
            
        } else if(myJSONType === 'chorale') {
            score += makeChoraleScore();
            
        } else {
            // hasn't been tested yet
            score += makeBasicScore();
            /*----------------------------------
			score += '\n\\new Staff {\n';
			score += '\\clef "' + myClef + '"\n';        
            score += '\\key ' + myKeySignatures + '\n';
            score += '\\time ' + myTimeSignature + '\n';
            score += '\\tempo ' + myTempo + '\n';
            score += '\\myMelody\n';
            score += '\n}\n';
            //-------------------------------------*/
        }
        
        return score;
    }
    
function makeChoraleScore() {
    var theTimeSig = (myTimeSignature == undefined)? '4/4': myTimeSignature;
    var theTempo = (myTempo == undefined)? '4=96': myTempo;
    var thePickupLength = (myPickupMeasureLength == undefined)? '' : myPickupMeasureLength;

    var sopranoInput = makeLilyNotes(myNotes, myDurations, myKeySignatures, myRomanNumerals);
    var altoInput = makeLilyNotes(myNotes2, myDurations2, myKeySignatures, myRomanNumerals);
    var tenorInput = makeLilyNotes(myNotes3, myDurations3, myKeySignatures, myRomanNumerals);
    var bassInput = makeLilyNotes(myNotes4, myDurations4, myKeySignatures, myRomanNumerals);
//    console.log('myNotes='+myNotes+' myDurations='+myDurations+' sopranoInput='+sopranoInput);
	var choraleTemplate = 'Timeline = {   \n' +
	'  \\time ' + theTimeSig + '  \n' +  
	'  \\tempo ' + theTempo + '  \n';
	
	if(thePickupLength !== "") {
	    choraleTemplate += '  \\partial ' + thePickupLength + '  \n';
    }
	
	// not needed?
//	'  s2 | s1 | s2 \\breathe s2 | s1 | s2 \\bar "||" \\break  \n' +
//	'  s2 | s1 | s2 \\breathe s2 | s1 | s2 \\bar "||"  \n' +

	choraleTemplate += '} \n' + 
	
	'SopranoMusic = ' + sopranoInput + 
	
	'\nAltoMusic = ' + altoInput +
	
	'\nTenorMusic = ' + tenorInput +
	
	'\nBassMusic =  ' + bassInput +
	
	'\nglobal = { \\key ' + myKeySignatures[0] + ' \\major' +
	
	'\n} \n' +
	
	'\\score {  % Start score \n' +
	'  << \n' +
	'    \\new PianoStaff <<  % Start pianostaff \n' +
	'      \\new Staff <<  % Start Staff = RH \n' +
	'        \\global \n' +
	'        \\clef "treble"  \n' +
	'        \\new Voice = "Soprano" <<  % Start Voice = "Soprano" \n' +
	'          \\Timeline \n' +
	'          \\voiceOne \n' +
	'          \\SopranoMusic \n' +
	'        >>  % End Voice = "Soprano" \n' +
	'        \\new Voice = "Alto" <<  % Start Voice = "Alto" \n' +
	'          \\Timeline \n' +
	'          \\voiceTwo \n' +
	'          \\AltoMusic \n' +
	'        >>  % End Voice = "Alto" \n' +
	'      >>  % End Staff = RH \n' +
	'      \\new Staff <<  % Start Staff = LH \n' +
	'        \\global \n' +
	'        \\clef "bass" \n' +
	'        \\new Voice = "Tenor" <<  % Start Voice = "Tenor" \n' +
	'          \\Timeline \n' +
	'          \\voiceOne \n' +
	'          \\TenorMusic \n' +
	'        >>  % End Voice = "Tenor" \n' +
	'        \\new Voice = "Bass" <<  % Start Voice = "Bass" \n' +
	'          \\Timeline \n' +
	'          \\voiceTwo \n' +
	'          \\BassMusic \n' +
	'        >>  % End Voice = "Bass" \n' +
	'      >>  % End Staff = LH \n' +
	'    >>  % End pianostaff  \n' +
	'  >> \n' +
	'}  % End score \n';
	
	
/*	
	'\\paper {  % Start paper block \n' +
	'  indent = 0     % dont indent first system \n' +
	'  line-width = 130   % shorten line length to suit music \n' +
	'}  % End paper block ';
*/

	return choraleTemplate;
}

    
    var pitchToLilyPitch  = { 
        'C': 'c', 'C#': 'cis', 'Cb': 'ces', 'Cx': 'cisis',
        'D': 'd', 'D#': 'dis', 'Db': 'des', 'Dx': 'disis',
        'E': 'e', 'E#': 'eis', 'Eb': 'ees', 'Ex': 'eisis',
        'F': 'f', 'F#': 'fis', 'Fb': 'fes', 'Fx': 'fisis',
        'G': 'g', 'G#': 'gis', 'Gb': 'ges', 'Gx': 'gisis',
        'A': 'a', 'A#': 'ais', 'Ab': 'aes', 'Ax': 'aisis',
        'B': 'b', 'B#': 'bis', 'Bb': 'bes', 'Bx': 'bisis'
    }
        
    var lilyPitchToTonejsPitch  = { 
        'c': 'C', 'cis': 'C#', 'ces': 'Cb', 'cisis': 'Cx', 'ceses': 'Cbb',
        'd': 'D', 'dis': 'D#', 'des': 'Db', 'disis': 'Dx', 'deses': 'Dbb',
        'e': 'E', 'eis': 'E#', 'ees': 'Eb', 'eisis': 'Ex', 'eeses': 'Ebb',
        'f': 'F', 'fis': 'F#', 'fes': 'Fb', 'fisis': 'Fx', 'feses': 'Fbb',
        'g': 'G', 'gis': 'G#', 'ges': 'Gb', 'gisis': 'Gx', 'geses': 'Gbb',
        'a': 'A', 'ais': 'A#', 'aes': 'Ab', 'aisis': 'Ax', 'aeses': 'Abb',
        'b': 'B', 'bis': 'B#', 'bes': 'Bb', 'bisis': 'B#', 'beses': 'Bbb'
    }

    
// tilde sign '~' is used with lilypond for tied notes
// this will need some additional processing to work 
// because the lilyletter name needs to be attached to 
// both numbers i.e. a8~a2
// as is this will result in a8~2 which doesn't work.
// instead check if lilyDuration.includes('~')
// then use lilyNote = createTiedLilyCode(lilyNote, lilyDuration)
	var durationToLilyDuration = {
//        "1n+2n": "1.",
		"1n" : "1", 
        "2n + 4n": "2.", "2n + 4n + 8n": "2..",
        "2n+4n": "2.", "2n+4n+8n": "2..",
		"d2n" : "2.", "2n" : "2", "2t" : "2",
        "4n + 8n": "4.", "4n + 8n + 16n":"4..",
        "4n+8n": "4.", "4n+8n+16n":"4..",
		"d4n" : "4.", "4n" : "4", "4t" :  "4",
        "8n + 16n": "8.", "8n + 16n + 32n": "8..",
        "8n+16n": "8.", "8n+16n+32n": "8..",
		"d8n" : "8.", "8n" : "8", "8t" : "8",
		"d16n" : "16.", "16n" : "16", "16t" : "16",
		"16n + 32n": "16.", "32n + 16n": "16.", "16n + 32n + 64n": "16..",
		"16n+32n": "16.", "32n+16n": "16.", "16n+32n+64n": "16..",
		"32n": "32", "32n + 64n": "32.", "64n + 32n": "32.", "64n": "64",

// tied notes ---------------------
 
        "2n + 4n + 2n + 4n": "2.~2.", 
        "1n + 2n": "1~2", "1n+2n": "1~2", "1n + 2n + 4n": "1~2.",
		"1n + 4n" : "1~4", "1m + 4n" : "1~4", "1n + 4n + 8n" : "1~4.",
		"1n+4n" : "1~4", "1m+4n" : "1~4", "1n + 4n + 8n" : "1~4.",
		"1n + 8n": "1~8", "2*1n": "1~1", "1n + 8n + 16n": "1~8.",
		"2n + 4n + 8n": "2.~8", "2n + 4n + 4n": "2.~4", "2n + 2n": "2~2", "2n + 4n + 2n": "2.~2",
		"2n + 4n + 1n": "2.~1", "2n + 2n + 4n": "2~2.",
		"2n + 4n": "2~4", "2n + 8n": "2~8", "2n + 1n": "2~1",
		"4n + 8n + 2n": "4.~2", "4n + 2n + 4n": "4~2.", "4n + 2n": "4~2",
		"4n + 16n": "4~16",
		"4n + 4n": "4~4", "4n+4n": "4~4", "4n + 1n": "4~1",
		"8n + 8n": "8~8", "8n + 2n + 4n": "8~2.", "8n + 4n + 8n": "8~4.",
		"8n + 1n": "8~1", "8n + 1n + 2n": "8~1.", "8n + 16n": "8~16",
        "8n + 2n": "8~2", "8n + 4n": "8~4",  "8n+4n": "8~4",
        "8n+8n": "8~8", "8n+2n": "8~2",
		"16n + 4n": "16~4", "16n + 2n": "16~2", // "4n + 8n": "4~8", 
		"16n + 2n + 4n": "16~2.", "16n + 1n": "16~1",
		"16n + 2n + 8n": "16~4.", "16n + 8n": "16~8",
		"16n + 16n": "16~16",
        "16n + 8n + 4n":"16~8~4", "16n+8n+4n":"16~8~4",
//---------------------------------

// rests
		"1nr" : "r1", "1mr" : "r1", 
		"2nr + 4nr" : "r2.", "2nr+4nr" : "r2.",
		"d2nr" : "r2.", "2nr" : "r2", "2tr" : "r2",
		"4nr + 8nr" : "r4.", "4nr+8nr" : "r4.",
		"d4nr" : "r4.", "4nr" : "r4", "4tr" :  "r4",
		"8nr + 16nr" : "r8.",
		"d8nr" : "r8.", "8nr" : "r8", "8tr" : "r8",
		"d16nr" : "r16.", "16nr" : "r16", "16tr" : "r16",

// rest - different format
		"1r" : "r1", 
		"2r + 4r" : "r2.",
		"d2r" : "r2.", "2r" : "r2", "2tr" : "r2",
		"4r + 8r" : "r4.",
		"d4r" : "r4.", "4r" : "r4", "4tr" :  "r4",
		"8r + 16r" : "r8.",
		"d8r" : "r8.", "8r" : "r8", "8tr" : "r8",
		"d16r" : "r16.", "16r" : "r16", "16tr" : "r16"

	};

//----------------------------
	var lilyDurationToToneJSDuration = {
//        "1n+2n": "1.",
		"1" : "1n", 
        "2.": "2n + 4n", "2..": "2n + 4n + 8n",
		"2" : "2n", // "2t" : "2",
        "4.": "4n + 8n", "4..": "4n + 8n + 16n",
		"4" : "4n", // "4t" :  "4",
        "8.": "8n + 16n", "8": "8n", // "8t" : "8",
		"16.": "16n + 32n", "16": "16n", // "16t" : "16",
		"32.": "32n + 64n", "32": "32n",
		"64.": "64n + 128n", "64": "64n",

// tied notes ---------------------
        "1~2.": "1n + 2n + 4n", "1~2": "1n + 2n", "1~4" : "1n + 4n",
        "1~4.": "1n + 4n + 8n", "1~8": "1n + 8n", "1~1": "2*1n",
        "1~8.": "1n + 8n + 16n", 
        "2.~8": "2n + 4n + 8n", "2~2": "2n + 2n", "2.~2.": "2n + 4n + 2n + 4n", 
        "2.~4": "2n + 4n + 4n", "2.~2": "2n + 4n + 2n", "2.~1": "2n + 4n + 1n", "2~2.": "2n + 2n + 4n", 
        "2~4": "2n + 4n", "2~8": "2n + 8n", "2~1": "2n + 1n",
        "4.~2": "4n + 8n + 2n",
        "4~2.": "4n + 2n+ 4n", "4~2": "4n + 2n", "4~16": "4n + 16n",
        "4~4": "4n + 4n", "8~8": "8n + 8n", "4~1": "4n + 1n",
        "8~2.": "8n + 2n + 4n", "8~8": "8n + 8n", "8~4.": "8n + 4n + 8n", "8~4": "8n + 4n",
        "8~1": "8n + 1n", "8~2": "8n + 2n", "8~1.": "8n + 1n + 2n", "8~16": "8n + 16n",
        "4~8": "4n + 8n", "16~4": "16n + 4n", "16~2": "16n + 2n",
        "16~2.": "16n + 2n + 4n",  "16~1": "16n + 1n", "16~4.": "16n + 2n + 8n",
        "16~8": "16n + 8n","16~8~4":"16n + 8n + 4n", "16~16": "16n + 16n", 
//---------------------------------

// rests
		"r1" : "1nr", 
		"r2." : "2nr + 4nr", "r2" : "2nr", // "2tr" : "r2",
		"r4." : "4nr + 8nr", "r4" : "4nr", // "4tr" :  "r4",
		"r8." : "8nr + 16nr", "r8" : "8nr", // "8tr" : "r8",
		"r16." : "d16nr", "r16" : "16nr" // "16tr" : "r16",

/* rest - different format
		"1r" : "r1", 
		"2r + 4r" : "r2.",
		"d2r" : "r2.", "2r" : "r2", "2tr" : "r2",
		"4r + 8r" : "r4.",
		"d4r" : "r4.", "4r" : "r4", "4tr" :  "r4",
		"8r + 16r" : "r8.",
		"d8r" : "r8.", "8r" : "r8", "8tr" : "r8",
		"d16r" : "r16.", "16r" : "r16", "16tr" : "r16"
*/
	};
//----------------------------

	
	var numbersToRhythmText = {
		"96": "1n", 
		"72": "d2n", "48": "2n", "32": "2t",
		"36": "d4n", "24": "4n", "16": "4t",
		"18": "d8n", "12": "8n", "8": "8t",
		"9": "d16n", "6": "16n", "4": "16t",
	
		"-96": "1r", 
		"-72": "d2r", "-48": "2r", "-32": "2tr",
		"-36": "d4r", "-24": "4r", "-16": "4tr",
		"-18": "d8r", "-12": "8r", "-8": "8tr",
		"-9": "d16r", "-6": "16r", "-4": "16tr"
	};

    function removeSubString(inputString, subString) {
        var subStrLength = subString.length;
        var indexSubStr = inputString.indexOf(subString);
        var newString = inputString.slice(0, indexSubStr);
        newString += inputString.slice(indexSubStr+subStrLength);
        return newString
    }

    function findOctaveSymbols(lilyCode) {
        var octaveSymbol = ',';
        var multiSymbol = '';
        var myOctaveSymbols = '';
        var numberIter = 0;
        if(lilyCode.indexOf(',') !== -1) {
            octaveSymbol = ',';
        } else if (lilyCode.indexOf('\'') !== -1) {
            octaveSymbol = '\'';
        }
		multiSymbol = octaveSymbol;
		while( lilyCode.indexOf(multiSymbol) !== -1) {
			myOctaveSymbols += octaveSymbol;
			multiSymbol += octaveSymbol;
			numberIter++;
			if(numberIter == 10) {
			    console.log('numberIter='+numberIter);
			    break;
			}
		}
		return myOctaveSymbols;
    }

//#################################################################
    // module GLOBALS for translateLilyToToneJS()
    var currentDuration = '';
    var currOctaveSymbol = '';
    var currentOctaveNumber;
    var usesRelativeOctave = false;
    var relativeOctave = "c''";
    var relativeCurrentOctave = "c''";
    
/**
 * this function takes a lilypond string and turns it into two arrays of notes and durations used with ToneJS
 * @param {string} lilyNoteCode 
 * @returns {object} multi-dimensional array of notes and durations
 * @example
 * var lilycode = "\\relative c' {c4 d e f g1}";
 * var results = translateLilyToToneJS(lilycode);
 * // results[0] = ["C4","D4","E4","F4","G4"]
 * // results[1] = ["4n","4n","4n","4n","1n"]
 */
    function translateLilyToToneJS(lilyNoteCode) {
        // trim white off of each end.
        var trimmedLily = lilyNoteCode.trim();
        studentLilypondCode = trimmedLily.slice();
        // split it into tokens
        var noteTokens = trimmedLily.split(/\s+/g); // split at white space

        var aNote = '';
        var aDuration = '';
        var myNotes = [];
        var myDurations = [];
        var prevToneNote = '';
        var toneNote = '';
        var oneToken = '';
        var nextToken = '';
        var chordNotes = '';
        var isChord = false;
        var firstOctaveIndex = 0;
        var lastOctaveIndex = 0;
        var octaveSymbol = '';
        var front = '';
        var back = '';
        var numberOfOctaveSymbols = 0;
        var hasOctaveSymbol = false;

        var octaveChange;
        var newOctaveNumber;
        var octaveNumString;

        var tildeIndex = 0;
        var octaveSymbolSecondNote = '';
        var tiedNotesArray;
        var firstNote = '';
        var secondNote = '';
        var tupletRatio = '';
        var isLilyTuplet = false;
        var tonejsTupletNotesAndRhythm = [];
        var noteAndOctave = [];
        
        // initialize the lily globals
        lilyKeySignature = '';
        lilyTempo = '';
        lilyTimeSignature = '';
        usesRelativeOctave = false;
        
        for(var i=0; i<noteTokens.length; i++) {
//            console.log('noteTokens['+ i +']='+noteTokens[i]);
            oneToken = noteTokens[i].slice();

            // look for relative tag
            if( oneToken.includes('\\relative') || oneToken.includes('\relative') ) {
                usesRelativeOctave = true;
                // next token is the relativeCurrentOctave value
                i++;
                relativeCurrentOctave = noteTokens[i].slice();
                continue;
            }

            // look for pickup measure (\partial)
            if( oneToken.includes('\\partial') || oneToken.includes('\partial') ) {
               // placeholder
                // next token is the number of counts in the pickup measure
                i++;
                // lilyPickupMeasure is a module global var
                lilyPickupMeasure = noteTokens[i].slice();
                continue;
            }

            // look for tempo (\tempo)
            if( oneToken.includes('\\tempo') || oneToken.includes('\tempo') ) {
               // placeholder
                // next tokens until one after the = sign
                // i.e. \tempo "allegro" 4 = 160
                lilyTempo = '';
//                for(var tempoIndex=0; tempoIndex<3; tempoIndex++) {
                while(noteTokens[i].slice() != '=') {
                    i++
                    // lilyTempo is a module global var
                    lilyTempo += ' ' + noteTokens[i].slice();
                }
                // one more token
                i++;
                lilyTempo += ' ' + noteTokens[i].slice();
                continue;
            }

            // look for tempo (\tempo)
            if( oneToken.includes('\\time') || oneToken.includes('\time') ) {
                // next tokens is time signature as a fraction (3/4)
                lilyTimeSignature = '';
                i++;
                // lilyTimeSignature is a module global var
                lilyTimeSignature += ' ' + noteTokens[i].slice();
                continue;
            }

            // look for key signature (\key)
            if( oneToken.includes('\\key') || oneToken.includes('\key') ) {
               // placeholder
                // next two tokens first is key letter, second is major or minor
                // i.e.  c \minor
                // lilyKeySignature is a module global var
                lilyKeySignature = '';
                for(var keyIndex=0; keyIndex<2; keyIndex++) {
                    i++;
                    // lilyTempo is a module global var
                    lilyKeySignature += ' ' + noteTokens[i].slice();
                }
                console.log('lilyKeySignature='+lilyKeySignature);
                continue;
            }


            // look for triplets
            if( oneToken.includes('\\tuplet') || oneToken.includes('\tuplet') ) {
                isLilyTuplet = true;
                // next token is the tuplet ratio value
                i++;
                tupletRatio = noteTokens[i].slice();
                console.log('tuplet: tupletRatio='+tupletRatio);
                i++;
                // next token should be the opening brace '{'
                oneToken = noteTokens[i].slice();
                if( oneToken.includes('{') )  {
                    // gather the notes inside of the triplet braces
                    i++;
                    oneToken = noteTokens[i].slice();
                    while(!oneToken.includes('}') ) {
                        lilyTupletNotes.push(oneToken);
                        i++; 
                        oneToken = noteTokens[i].slice();
                    }
                    // can only deal with triplets
                    console.log('relativeCurrentOctave='+relativeCurrentOctave+' prevToneNote='+prevToneNote);
                    tonejsTupletNotesAndRhythmAndOctave = processLilyTuplet(prevToneNote, lilyTupletNotes, tupletRatio, relativeCurrentOctave, usesRelativeOctave);                 
                    for(var idx=0; idx<tonejsTupletNotesAndRhythmAndOctave[0].length; idx++) {
                        myNotes.push( tonejsTupletNotesAndRhythmAndOctave[0][idx]);
                        myDurations.push( tonejsTupletNotesAndRhythmAndOctave[1][idx]);
                    }
                    currentOctaveNumber = tonejsTupletNotesAndRhythmAndOctave[2][0];
                    relativeCurrentOctave = tonejsTupletNotesAndRhythmAndOctave[2][1];
                    isLilyTuplet = false;
                    tonejsNotesAndRhythm = [];
                    lilyTupletNotes = [];
                    prevToneNote = myNotes[myNotes.length-1];
                }
                continue;
            }

            // look for comments (multi-line)
            if( oneToken.includes('%{') )  {
                // gather the comment text
                i++; 
                oneToken = noteTokens[i].slice();
                comment = "";
                while(!oneToken.includes('%}') ) {
                    comment += " " + oneToken;
                    i++; 
                    oneToken = noteTokens[i].slice();
                }
                // we store the comment but don't do anything with it
                myComments[commentIndex] = comment;
                console.log('comment='+comment);
                commentIndex += 1;
                comment = "";
                continue;
            }

/*-----------------------------
            // look for comments (single-line)
            if( oneToken.includes('%') )  {
                // gather the comment text
                var comment = "";
                while(!oneToken.includes('%}') ) {
                    lilyTupletNotes.push(oneToken);
                    i++; 
                    comment += " "+noteTokens[i].slice();
                }
                continue;
            }
//-----------------------------*/

            // ignore the braces
            if( (oneToken.includes('{') || oneToken.includes('}') ) && !isLilyTuplet)  {
                continue
            }


            // look for chords
            if( oneToken.includes('<')  ) {
                isChord = true;
                chordNotes = '';
                chordNotes += oneToken;
                while( !noteTokens[i].includes('>') ) {
                    i++
                    chordNotes += ' ' + noteTokens[i];
                }
//                console.log('chordNotes='+chordNotes+' prevToneNote'+prevToneNote+' relativeCurrentOctave='+relativeCurrentOctave+' typeof(relativeCurrentOctave)='+typeof(relativeCurrentOctave)+' currentDuration='+currentDuration);
                chordAndDuration = processLilyChord(prevToneNote, chordNotes, relativeCurrentOctave);
                myNotes.push(chordAndDuration[0]);
                myDurations.push(chordAndDuration[1]);
                prevToneNote = myNotes[myNotes.length-1][0];
//                console.log('prevToneNote='+prevToneNote+' typeof(chordAndDuration[0])='+typeof(chordAndDuration[0])+' chordAndDuration[0]='+chordAndDuration[0]+'\ntypeof(chordAndDuration[1])='+typeof(chordAndDuration[1])+' chordAndDuration[1]='+chordAndDuration[1]);
                continue;
            }

            
            // look for barlines
            if( oneToken.includes('|') ) {
                // ignore barlines for now
//                console.log('  barline: oneToken='+oneToken);
                continue;
            }
            // check for ties
            if( oneToken.includes('~') ) {
                // process ties notes
                tildeIndex = oneToken.indexOf('~')
                if(tildeIndex == oneToken.length-1) {
                    // there a space after the tilde
                    // the next token is the other tied note.
                    // increment i and process them together
                    i++;
                    nextToken = noteTokens[i];
                    oneToken += nextToken;
                }

                // split the two notes apart and remove the octave symbols from the second note
                tiedNotesArray = oneToken.split('~');
                firstNote = tiedNotesArray[0];
                secondNote = tiedNotesArray[1];      
                octaveSymbolSecondNote = findOctaveSymbols(secondNote);
                secondNote = removeSubString(secondNote, octaveSymbolSecondNote);
                oneToken = firstNote + '~' + secondNote;

                // I don't think tildeIndex has changed but just in case
                tildeIndex = oneToken.indexOf('~')
                if( oneToken.includes('es') || oneToken.includes('is') ) {
                    // remove the second note name so aes'4~aes8 becomes aes'4~8
                    front = oneToken.slice(0,tildeIndex+1);
                    back = oneToken.slice(tildeIndex+4);
                    oneToken = front + back;
                } else {
                    // remove the second note name so a'4~a8 becomes a'4~8
                    front = oneToken.slice(0,tildeIndex+1);
                    back = oneToken.slice(tildeIndex+2);
                    oneToken = front + back;
                }
            }
            // check for octave symbols
            // TODO: look for double octave jumps
            // NOTE ' symbol is escaped with \'
            
            
			if( oneToken.includes('\'') || oneToken.includes(',') ) {
                noteAndOctave = processOctaveSign(oneToken);
				hasOctaveSymbol = true;
                oneToken = noteAndOctave[0];
                currOctaveSymbol = noteAndOctave[1];
//                console.log('oneToken='+oneToken+' currOctaveSymbol='+currOctaveSymbol);
			}
			
            // check for rests
            if( oneToken.includes('r') ) {
                aNote = 'rest';
                // keep the entire token including 'r', (used in translation to ToneJS format)
                aDuration = oneToken.slice(0);
            } else if( oneToken.includes('es') || oneToken.includes('is') ) {
                // check for double sharp of flat
                if( oneToken.includes('eses') || oneToken.includes('isis') ) {
                    aNote = oneToken.slice(0,5);
                    aDuration = oneToken.slice(5);                
                } else {
					// check for flat ('es') or sharp ('is')
					aNote = oneToken.slice(0,3);
					aDuration = oneToken.slice(3);
                }
            } else { // regular letter
                aNote = oneToken.slice(0,1);
                aDuration = oneToken.slice(1);
            }
            if(aDuration !== '') {
                // process lily duration in to toneDuration
                currentDuration = lilyDurationToToneJSDuration[aDuration];
//                console.log('currentDuration='+currentDuration+' currentDuration.length='+currentDuration.length);
            }
//            console.log('aNote='+aNote);
            if(aNote !== 'rest') {
                toneNote = lilyPitchToTonejsPitch[aNote];
                if(toneNote === undefined) {
                    alert(''+oneToken+' === undefined');
                    return [[],[]];
                }
                if(hasOctaveSymbol) {
                    if(usesRelativeOctave) {
                        currentOctaveNumber = convertlilyOctaveToNumber(relativeCurrentOctave);
                        octaveChange = lilyOctaveToOctaveChange[currOctaveSymbol];
                        newOctaveNumber = currentOctaveNumber+octaveChange;
//

                        octaveNumString = calcOctaveNumber(newOctaveNumber, prevToneNote, toneNote);
                        toneNote += octaveNumString;

//                        console.log('(1) usesRelativeOctave currentOctaveNumber='+currentOctaveNumber+' relativeCurrentOctave='+relativeCurrentOctave);
                        relativeCurrentOctave = setRelativeCurrentOctave(parseInt(octaveNumString));
                        currentOctaveNumber = parseInt(octaveNumString)
//                        console.log('update:  toneNote='+toneNote+' currentOctaveNumber='+currentOctaveNumber+' relativeCurrentOctave='+relativeCurrentOctave);
                        myNotes.push(toneNote);
                    } else {
                        // add octave number to toneNote
                        toneNote += lilyOctaveToOctaveNumber[currOctaveSymbol]
                        myNotes.push(toneNote);
                    }
                } else if(usesRelativeOctave) {
                    if(prevToneNote == '') {
                        currentOctaveNumber = convertlilyOctaveToNumber(relativeCurrentOctave);
                        prevToneNote = 'C';
                    }
                    // add octave number to toneNote
//                    console.log('currentOctaveNumber='+currentOctaveNumber+' prevToneNote='+prevToneNote+' toneNote='+toneNote);
                    octaveNumString = calcOctaveNumber(currentOctaveNumber, prevToneNote, toneNote);
                    toneNote += octaveNumString;
                    relativeCurrentOctave = setRelativeCurrentOctave(parseInt(octaveNumString));
                    currentOctaveNumber = parseInt(octaveNumString);
//                    console.log('(2) usesRelativeOctave toneNote='+toneNote);
                    myNotes.push(toneNote);                
                } else {
                    // default for this weird case, not \relative yet no octave symbol
                    toneNote += '3'; 
                    myNotes.push(toneNote);                                
                }
                prevToneNote = toneNote;
            }
//            console.log('currentDuration='+currentDuration)
            myDurations.push(currentDuration);
            
            // reset vars
            oneToken = '';
            firstOctaveIndex = 0;
            lastOctaveIndex = 0;
            octaveSymbol = '';
            front = '';
            back = '';
            numberOfOctaveSymbols = 0;
            hasOctaveSymbol = false;
            currOctaveSymbol = "";
            isChord = false;
            
        }
        var combinedArray = [];
        combinedArray.push(myNotes);
        combinedArray.push(myDurations);
//        console.log('myNotes='+myNotes);
//        console.log('myDurations='+myDurations);
        // check if (lilyKeySignature ! == "") also lilyTempo, lilyTimeSignature != ''

        return combinedArray;
    }


    function processLilyTuplet(thePrevNote, theTupletNotes, theTupletRatio, currentOctave, usesRelativeOctaveMode) {
        var notesAndRhythmAndOctave = [];
        var noteArray = [];
        var durationArray = [];
        var aToken = '';
        var theNote;
        var theDuration;
        var atildeIndex;
        var atiedNotesArray
        var afirstNote
        var asecondNote
        var frontPart;
        var backPart;
        var firstNote;
        var secondNote;
        var tiedNoteArray;
        var octaveSymbolSecondNote;
        var hasOctaveSymbol = false;
        var firstOctaveIndex;
        var lastOctaveIndex;
        var theOctaveSymbol;
        var theCurrOctaveSymbol;
        var theCurrentDuration;
        var aToneNote = '';
        var aPrevToneNote = thePrevNote;
        var currentOctaveNumber;
        var octaveChange;
        var newOctaveNumber;
        var relativeCurrentOctave = currentOctave;
        
//        console.log('processLilyTuplet(): theTupletNotes='+theTupletNotes+' relativeCurrentOctave='+relativeCurrentOctave);
        for(var i=0; i<theTupletNotes.length; i++) {
            aToken = theTupletNotes[i].slice();
            // check for ties
            if( aToken.includes('~') ) {
                // process ties notes
                atildeIndex = aToken.indexOf('~')
                if(atildeIndex == aToken.length-1) {
                    // there a space after the tilde
                    // the next token is the other tied note.
                    // increment i and process them together
                    i++;
                    nextToken = theTupletNotes[i];
                    aToken += nextToken;
                }

                // split the two notes apart and remove the octave symbols from the second note
                tiedNotesArray = aToken.split('~');
                firstNote = tiedNotesArray[0];
                secondNote = tiedNotesArray[1];      
                octaveSymbolSecondNote = findOctaveSymbols(secondNote);
                secondNote = removeSubString(secondNote, octaveSymbolSecondNote);
                aToken = firstNote + '~' + secondNote;

                // I don't think tildeIndex has changed but just in case
                atildeIndex = aToken.indexOf('~')
                if( aToken.includes('es') || aToken.includes('is') ) {
                    // remove the second note name so aes'4~aes8 becomes aes'4~8
                    frontPart = aToken.slice(0,atildeIndex+1);
                    backPart = aToken.slice(atildeIndex+4);
                    aToken = frontPart + backPart;
                } else {
                    // remove the second note name so a'4~a8 becomes a'4~8
                    frontPart = aToken.slice(0,atildeIndex+1);
                    backPart = aToken.slice(atildeIndex+2);
                    aToken = frontPart + backPart;
                }
            }
            // check for octave symbols
			if( aToken.includes('\'') || aToken.includes(',') ) {
				// extract octave symbols
				hasOctaveSymbol = true;
//                console.log('  octave symbol: aToken='+aToken);
				if( aToken.includes('\'') ) {
					firstOctaveIndex = aToken.indexOf('\'');
					lastOctaveIndex = aToken.lastIndexOf('\'');
					theOctaveSymbol = '\'';
				} else if( aToken.includes(',') ) {
					firstOctaveIndex = aToken.indexOf(',');
					lastOctaveIndex = aToken.lastIndexOf(',');
					theOctaveSymbol = ',';
				}
				frontPart = aToken.slice(0,firstOctaveIndex);
				backPart = aToken.slice(lastOctaveIndex+1);
				aToken = frontPart + backPart;
//                console.log('frontPart='+frontPart+' backPart='+backPart+' removed octave symbols: aToken='+aToken);
				theNumberOfOctaveSymbols = (lastOctaveIndex-firstOctaveIndex)+1;
//                console.log('theNumberOfOctaveSymbols='+theNumberOfOctaveSymbols);
				theNumberOfOctaveSymbols = Math.abs(theNumberOfOctaveSymbols);
				theCurrOctaveSymbol = '';
				for(var j=0; j<theNumberOfOctaveSymbols; j++) {
					theCurrOctaveSymbol += theOctaveSymbol; 
				}
			}            
		
            // check for rests
            if( aToken.includes('r') ) {
                theNote = 'rest'; 
                theDuration = aToken.slice(0);
            } else if( aToken.includes('es') || aToken.includes('is') ) {
                // check for flat ('es') or sharp ('is')
                theNote = aToken.slice(0,3);
                theDuration = aToken.slice(3);
            } else { // regular letter
                theNote = aToken.slice(0,1);
                theDuration = aToken.slice(1);
            }
            if(theDuration !== '') {
                // process lily duration in to toneDuration
                theCurrentDuration = lilyDurationToToneJSDuration[theDuration];
//                console.log('theCurrentDuration='+theCurrentDuration+' theCurrentDuration.length='+theCurrentDuration.length);
            }
//            console.log('theNote='+theNote);
            if(theNote !== 'rest') {
                aToneNote = lilyPitchToTonejsPitch[theNote];
                console.log('aToneNote='+aToneNote);
                if(hasOctaveSymbol) {
                    if(usesRelativeOctaveMode) {
                        currentOctaveNumber = convertlilyOctaveToNumber(relativeCurrentOctave);
                        octaveChange = lilyOctaveToOctaveChange[theCurrOctaveSymbol];
                        newOctaveNumber = currentOctaveNumber+octaveChange;
//                        console.log('currentOctave='+currentOctave+' currentOctaveNumber='+currentOctaveNumber+' theCurrOctaveSymbol='+theCurrOctaveSymbol+' octaveChange='+octaveChange)
//

                        octaveNumString = calcOctaveNumber(newOctaveNumber, aPrevToneNote, aToneNote);
                        aToneNote += octaveNumString;

//                        console.log('(1*) usesRelativeOctave aPrevToneNote='+aPrevToneNote+' aToneNote='+aToneNote+' currentOctaveNumber='+currentOctaveNumber+' relativeCurrentOctave='+relativeCurrentOctave);
                        relativeCurrentOctave = setRelativeCurrentOctave(parseInt(octaveNumString));
                        currentOctaveNumber = parseInt(octaveNumString)
//                        console.log('update:  aToneNote='+aToneNote+' currentOctaveNumber='+currentOctaveNumber+' relativeCurrentOctave='+relativeCurrentOctave);
                        noteArray.push(aToneNote);
                    } else {
                        // add octave number to toneNote
                        aToneNote += lilyOctaveToOctaveNumber[currOctaveSymbol]
                        noteArray.push(aToneNote);
                    }
                } else if(usesRelativeOctaveMode) {
                    if(aPrevToneNote == '') {
                        aPrevToneNote = 'C';
                    }
                    currentOctaveNumber = convertlilyOctaveToNumber(relativeCurrentOctave);
                    // add octave number to toneNote
                    octaveNumString = calcOctaveNumber(currentOctaveNumber, aPrevToneNote, aToneNote);
                    aToneNote += octaveNumString;
                    relativeCurrentOctave = setRelativeCurrentOctave(parseInt(octaveNumString));
                    currentOctaveNumber = parseInt(octaveNumString);
//                    console.log('(2*) usesRelativeOctaveMode currentOctaveNumber='+currentOctaveNumber+' aPrevToneNote='+aPrevToneNote+' aToneNote='+aToneNote);
                    noteArray.push(aToneNote);                
                } else {
                    // default for this weird case, not \relative yet no octave symbol
                    aToneNote += '4'; 
                    noteArray.push(aToneNote);                                
                }
                aPrevToneNote = aToneNote;
            }
            console.log('currentDuration='+currentDuration+' theCurrentDuration='+theCurrentDuration);
            theCurrentDuration = theCurrentDuration.slice(0, theCurrentDuration.length-1) + 't';
            durationArray.push(theCurrentDuration);   
            
            // reset for next time thru loop
            hasOctaveSymbol = false;
        }
        notesAndRhythmAndOctave.push(noteArray);
        notesAndRhythmAndOctave.push(durationArray);
        var octaveInfo = [];
        octaveInfo.push(currentOctaveNumber);
        octaveInfo.push(relativeCurrentOctave);
        notesAndRhythmAndOctave.push(octaveInfo);
//        console.log('processLilyTuplet(): noteArray='+noteArray)
//        console.log('processLilyTuplet(): durationArray='+durationArray)
//        console.log('processLilyTuplet(): octaveInfo='+octaveInfo)
        return notesAndRhythmAndOctave;
    }
    
    function processLilyChord(thePrevToneNote, theChordNotes, theCurrentOctave) {
    // NOTE: theCurrentOctave param is in the form of c', it's a global that we
    // might need to change
    
        var chordAndDuration = [];
        var chordToneArray = [];
        var lilyChordArray = [];
        var startIndex;
        var theDuration;
        var theToneNote;
        var theToneDuration;
        var lastFullToken;
        var lastToken;
        var theOctaveNumString;
        var theRelativeCurrentOctave;
        var chordPrevToneNote;
        var newRootOctave;
        var rootRelativeCurrentOctave;
        var octaveSymbol = '';;

        // global to the module
        currentOctaveNumber = convertlilyOctaveToNumber(theCurrentOctave);
//        console.log('theCurrentOctave='+theCurrentOctave+' currentOctaveNumber='+currentOctaveNumber);
        
        // extract the notes from the theChordNotes string in the format '<c e g>2'
        // arbitrary number of chord tones and optional trailing duration
        // if no duration, use currentDuration global
        var chordTokens = theChordNotes.split(/\s+/g); // split at white space
        if(chordTokens[0].length > 1) {
            lilyChordArray.push(removeSubString(chordTokens[0], '<'));
            startIndex = 1;
        } else {
            // first token was just '<'
            startIndex = 1;
        }
        for(var i=startIndex; i<chordTokens.length-1; i++) {
            lilyChordArray.push(chordTokens[i]);
        }

        // process last token
        var lastCharPossibleNum = '';
        lastFullToken = chordTokens[i].slice();
        // check to see if closing bracket is attached to note or number
        if(lastFullToken != '>' ) {
			// get index of the '>' char
//			console.log('lastFullToken='+lastFullToken);
			var indexEndOfChord = lastFullToken.indexOf('>');
			if(indexEndOfChord != -1) {
				theDuration = lastFullToken.slice(indexEndOfChord+1);
				if(theDuration.charAt(theDuration.length-1) == ".") {
					lastCharPossibleNum = theDuration.slice(0,theDuration.length-1);
//					console.log('1 lastCharPossibleNum='+lastCharPossibleNum);
				} else {
					lastCharPossibleNum = theDuration;
				}
			}  else {
				lastCharPossibleNum = '';
			}
        }
//        console.log('2 lastCharPossibleNum='+lastCharPossibleNum+' theDuration='+theDuration);
        
        if( Number.isInteger( parseInt(lastCharPossibleNum) ) ) {
            lastToken = removeSubString(chordTokens[i], theDuration);
            lastToken = removeSubString(lastToken, '>');
            theDuration = lilyDurationToToneJSDuration[theDuration];
//            console.log('1 theDuration='+theDuration);
        } else {
            lastToken = removeSubString(chordTokens[i], '>');
            theDuration = currentDuration;
//            console.log('2 theDuration='+theDuration);
        }
        if(lastToken != '') {
            lilyChordArray.push(lastToken);
        }
        chordPrevToneNote = thePrevToneNote;
        theRelativeCurrentOctave = currentOctaveNumber;
//        console.log('thePrevToneNote='+thePrevToneNote+' lilyChordArray='+lilyChordArray+' currentOctaveNumber='+currentOctaveNumber+' theCurrentOctave='+theCurrentOctave+' currentDuration='+currentDuration+' theDuration='+theDuration);
        for(var i=0; i<lilyChordArray.length; i++) {
            // check for octave marks 
            octaveSymbol = "";
            if(lilyChordArray[i].includes('\'') || lilyChordArray[i].includes(',') ) {
                noteAndOctave = processOctaveSign(lilyChordArray[i]);
                theToneNote = lilyPitchToTonejsPitch[noteAndOctave[0]];
                octaveSymbol = noteAndOctave[1];
            }  else {
                theToneNote = lilyPitchToTonejsPitch[lilyChordArray[i]];
            }
            
            // TODO: Use octaveSymbol to change theRelativeCurrentOctave value;
            theRelativeCurrentOctave = theRelativeCurrentOctave + lilyOctaveToOctaveChange[octaveSymbol]; 

//            console.log('lilyOctaveToOctaveChange[octaveSymbol]='+lilyOctaveToOctaveChange[octaveSymbol]+' theRelativeCurrentOctave='+theRelativeCurrentOctave+' typeof(theRelativeCurrentOctave)='+typeof(theRelativeCurrentOctave)+' chordPrevToneNote='+chordPrevToneNote+' theToneNote='+theToneNote);
			theOctaveNumString = calcOctaveNumber(theRelativeCurrentOctave, chordPrevToneNote, theToneNote);
//			console.log('theOctaveNumString='+theOctaveNumString);
			theToneNote += theOctaveNumString;
			
			theRelativeCurrentOctave = parseInt(theOctaveNumString);
			if(i==0) {
			    newRootOctave = theRelativeCurrentOctave;
			    rootRelativeCurrentOctave = setRelativeCurrentOctave(parseInt(theOctaveNumString));
			}
            chordToneArray.push(theToneNote);
            chordPrevToneNote = theToneNote;
        }
        
        chordAndDuration.push(chordToneArray);
        chordAndDuration.push(theDuration);
        // reset globals currentDuration
        currentDuration = theDuration;
        currentOctaveNumber = newRootOctave;
        relativeCurrentOctave = rootRelativeCurrentOctave;
//        console.log('theDuration='+theDuration+' currentOctaveNumber='+currentOctaveNumber);
        return chordAndDuration;
    }
    
	function processOctaveSign(oneToken) {
		var octaveSymbol;
		var firstOctaveIndex;
		var lastOctaveIndex;
		var front;
		var back;
		var numberOfOctaveSymbols;
		var currOctaveSymbol;
		var noteAndOctave = []
		
		// extract octave symbols
//		console.log('  octave symbol: oneToken='+oneToken);
		if( oneToken.includes('\'') ) {
			firstOctaveIndex = oneToken.indexOf('\'');
			lastOctaveIndex = oneToken.lastIndexOf('\'');
			octaveSymbol = '\'';
		} else if( oneToken.includes(',') ) {
			firstOctaveIndex = oneToken.indexOf(',');
			lastOctaveIndex = oneToken.lastIndexOf(',');
			octaveSymbol = ',';
		}
		front = oneToken.slice(0,firstOctaveIndex);
		back = oneToken.slice(lastOctaveIndex+1);
		oneToken = front + back;
	//    console.log('front='+front+' back='+back+' removed octave symbols: oneToken='+oneToken);
		numberOfOctaveSymbols = (lastOctaveIndex-firstOctaveIndex)+1;
	//    console.log('numberOfOctaveSymbols='+numberOfOctaveSymbols);
		numberOfOctaveSymbols = Math.abs(numberOfOctaveSymbols);
		currOctaveSymbol = '';
		for(var j=0; j<numberOfOctaveSymbols; j++) {
			currOctaveSymbol += octaveSymbol; 
		}
		// we need two return values, oneToken and currOctaveSymbol
		noteAndOctave.push(oneToken);
		noteAndOctave.push(currOctaveSymbol);
		return noteAndOctave;
	}
	
/**
 * this function returns the keySig, tempo and timeSig from the lilyPondAdapter object
 * @returns {object} 
 */
    function getLilyEntryScoreParams() {
        var params = {
            "keySig": lilyKeySignature,
            "tempo": lilyTempo,
            "timeSig": lilyTimeSignature
        }
        return params;
    }


    function setRelativeCurrentOctave(octaveNumber) {
        var newSymbol = 'c' + octaveToLilyOctave[octaveNumber.toString()];
        return newSymbol;
    }
    
    function convertlilyOctaveToNumber(lilyCode) {
        var lilySymbols = findOctaveSymbols(lilyCode);        
        var octaveNumber = lilyOctaveToOctaveNumber[lilySymbols];
//        console.log('lilySymbols='+lilySymbols+' octaveNumber='+octaveNumber);
        return parseInt(octaveNumber);
    }
    
    function calcOctaveNumber(currentOctave, prevToneNote, toneNote) {
        // extract just the letter name (no # or b)
        var i;
        var prevLetter;
        var indexPrev, indexCurrentNote;
        var prevOctave, newOctave, octaveDifference;
        var currentLetter = toneNote.slice(0,1);
        var threeOctaves = ['A1','B1','C2','D2','E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4'];
        var offsetToMiddleOctave = 7;
        
        if(prevToneNote == '') {
            prevLetter = 'C';
        } else {
            prevLetter = prevToneNote.slice(0,1);
        }
        
        for(i=offsetToMiddleOctave; i<threeOctaves.length; i++) {
            if(threeOctaves[i].includes(prevLetter) ) {
                indexPrev = i;
                break;
            }
        }
        for(i=0; i<threeOctaves.length; i++) {
            if(threeOctaves[indexPrev+i].includes(currentLetter) ) {
                indexCurrentNote = indexPrev+i;
                break;
            }
            if(threeOctaves[indexPrev-i].includes(currentLetter) ) {
                indexCurrentNote = indexPrev-i;
                break;
            }
        }
        // compare the number of the two indexes
        prevOctave = parseInt(threeOctaves[indexPrev].slice(1));
        newOctave = parseInt(threeOctaves[indexCurrentNote].slice(1));
        octaveDifference = prevOctave - newOctave;
        return currentOctave-octaveDifference;
    }

//##################################################################################################
// AssignmentGrader code 
//##################################################################################################
// AssignmentGrader globals
    var studentLilypondCode;
    var revealAnswers = true;

	function makeAssignmentJSON() {
	    var assignmentIndex = AssignmentNameToIndex[myOpus];
//	    console.log('myOpus='+myOpus)
	    if(assignmentIndex > 16) {
			var jsonBlob = {
				"jsonType":"Music10-Assignment-Student",
				"assignment": myOpus,
				"name": myComposer,
				"lilycode": studentLilypondCode,
				"notes": myNotes,
				"durations": myDurations,
				"notes2": myNotes2,
				"durations2": myDurations2,
				"tempo": "80",
				"authentication": "",
				"extra": ""
			};
		} else {
			var jsonBlob = {
				"jsonType":"Music10-Assignment-Student",
				"assignment": myOpus,
				"name": myComposer,
				"lilycode": studentLilypondCode,
				"notes": myNotes,
				"durations": myDurations,
				"tempo": "80",
				"authentication": "",
				"extra": ""
			};
		}
		return jsonBlob;
	}

// chord1 and chord2 are in the form of ['C4,'E4','G4']
    function chordsContainSamePitchNames(chord1, chord2) {
        var chord1Names = chord1;
        var chord2Names = chord2;
        var chord1MIDI = [];
        var chord2MIDI = [];
        var booleanArray1 = new Array(chord1.length);
        var booleanArray2 = new Array(chord2.length);
        booleanArray1.fill(false);
        booleanArray2.fill(false);
        var i=0;
        var j=0;
        for(i=0; i<chord1Names.length; i++) {
            chord1MIDI.push( noteNameToMIDI(chord1Names[i]) )
        }
        for(i=0; i<chord2Names.length; i++) {
            chord2MIDI.push( noteNameToMIDI(chord2Names[i]) )
        }
        for(i=0; i<chord1MIDI.length; i++) {
            for(j=0; j<chord2MIDI.length; j++) {
                // compare each chord1MIDI with a loop of chord2MIDI
                if( (Math.abs(chord1MIDI[i]-chord2MIDI[j]) % 12) === 0) {
                    booleanArray1[i] = true;
                    booleanArray2[j] = true;
                }
            }        
        }
        // return true only if there are no false values in either array
        return ( !booleanArray1.includes(false) && !booleanArray2.includes(false) )
    }


// this is hardcoded to the myJSON_Mus10_Assignments array from Mus10AssignmentArray.js file
// to be a generic grader it needs to be decoupled
    function loadModelAnswerJSON(assignment) {
        var index = AssignmentNameToIndex[assignment];
        var jsonAnswer = myJSON_Mus10_Assignments[index];
//        console.log("typeof(jsonAnswer)="+typeof(jsonAnswer));
//        console.log('jsonAnswer.keys()='+jsonAnswer.keys()+' jsonAnswer.values()='+jsonAnswer.values()+' index='+index);
        return jsonAnswer;
    }


    // module globals for eval percentages.
    var notes1Percentage;
    var durations1Percentage;
    var notes2Percentage;
    var durations2Percentage;
    var totalPercentage;
    

// This is the main evaluation code 
// TODO: rework using typeof detection so the code and deciphed if it is a note or a chord.
// instead of current method of checking assignment number
    function evalStudentAnswers(studentJSON, modelJSON) {
        var noteErrorIndexArray = [];
        var restErrorIndexArray = [];
        errorIndexArray = [];
        errorIndexArray2 = [];
        var usesChords = false;
        var chordReport = '';
        var report = "";
        if(modelJSON == undefined) {
            return report;
        }
        var numberCorrectNotes = 0;
        var numberCorrectDurations = 0;
        var studentNotes = studentJSON.notes;
        var correctNotes;
        // assignments 14-17 == indices 13-16
        var assignmentIndex = AssignmentNameToIndex[studentJSON.assignment];
        if(assignmentIndex > 19) {
            report = evalPianoScore(studentJSON, modelJSON);
//            console.log('report='+report);
            return report;
        }

        if(12 < assignmentIndex && assignmentIndex < 17 ) {
            var chordArray = modelJSON.notes.split(',');
            correctNotes = [];
            for(var idx=0; idx<chordArray.length; idx++) {
                correctNotes.push( chordArray[idx].split(' ') );
            }
            usesChords = true;
        } else {
            correctNotes = modelJSON.notes.split(',');
        }

        var studentDurations = studentJSON.durations;
        var correctDurations = modelJSON.durations.split(',');
        report += "Evaluation report for " +studentJSON.name+ " on "+studentJSON.assignment+ "\n\n";
        if(studentNotes.length !== correctNotes.length) {
            // not the same number of notes
            var difference = studentNotes.length-correctNotes.length;
            report += "You entered ";
            if(difference > 0) {
                report += "" +difference+ " too many ";
            } else {
                report += "" +Math.abs(difference)+ " too few ";
            }
            report += " notes.  Your score cannot be accurately evaluated.\n\n";
        }
        var length = studentNotes.length;
        var studentMIDI, correctMIDI;
        for(var i=0; i<length; i++) {
            if(usesChords) {
//                chordReport = evalChord(studentNotes[i], correctNotes[i]);
                chordReport = evalChordTones(studentNotes[i], correctNotes[i]);
//                chordReport = evalChordTones(studentRightHandNotes[i], correctRightHandNotes[i]);

                if(chordReport == '') {
                    numberCorrectNotes++;
                } else {
                    report += 'Chord number '+(i+1)+' is wrong. ';
                    report += chordReport+ '\n\n';
                    noteErrorIndexArray.push(i);
                }
                continue;
            }
            studentMIDI = noteNameToMIDI(studentNotes[i]);
            correctMIDI = noteNameToMIDI(correctNotes[i]);
//            console.log('studentMIDI='+studentMIDI+' correctMIDI='+correctMIDI);

            // this loop is when a more sophisticated eval function could go
            // currently allows the student to be + or - an octave
            if((studentMIDI !== correctMIDI) && ((studentMIDI-12) !== correctMIDI) && ((studentMIDI+12) !== correctMIDI) ) {
                noteErrorIndexArray.push(i);
                report += "Note number " +(i+1)+ " is incorrect.";
                if(revealAnswers) {
                    report += " You entered "+studentNotes[i]+" but the correct note is "+correctNotes[i];
                }
                report += '\n\n';

            } else {
                numberCorrectNotes++;
            }
        }
        var durLength = studentDurations.length;
        for(var j=0; j<durLength; j++) {
            if(studentDurations[j] !== correctDurations[j]) {
                restErrorIndexArray.push(j);
                report += "The duration of entry number " +(j+1)+ " is incorrect.";
                if(revealAnswers) {
                    report += " You entered a duration of "+studentDurations[j]+" but the correct duration is "+correctDurations[j]+"\n\n";
                }
            } else {
                numberCorrectDurations++;
            }
        }
//        console.log('noteErrorIndexArray.length='+noteErrorIndexArray.length+' restErrorIndexArray.length='+restErrorIndexArray.length);
        if(noteErrorIndexArray.length>0 || restErrorIndexArray.length>0) {
            errorIndexArray.push(noteErrorIndexArray);
            errorIndexArray.push(restErrorIndexArray);
        } else {
            errorIndexArray = undefined;
        }
        var noteScore = (numberCorrectNotes/length)*100;
        var durationScore = (numberCorrectDurations/durLength)*100;
        report += "NOTES = "+ Number.parseFloat(noteScore).toFixed(2) +"%";
        report += " | DURATIONS = "+ Number.parseFloat(durationScore).toFixed(2) +"%\n\n";
        report += "OVERALL SCORE = "+ Number.parseFloat((noteScore+durationScore)/2).toFixed(2) +"%";
        if(numberCorrectNotes == length && numberCorrectDurations == durLength) {
            report += "\n\nCongratulations, perfect score!";
        }
        // extract the evaluation percentages
        notes1Percentage = Number.parseFloat(noteScore).toFixed(2);
        durations1Percentage = Number.parseFloat(durationScore).toFixed(2);

        totalPercentage = Number.parseFloat((noteScore+durationScore)/2).toFixed(2);
//        console.log('(1) totalPercentage='+totalPercentage);

        return report;
    }
    
    function getNotes1Percentage() {
        return notes1Percentage;
    }
    
    function getNotes2Percentage() {
        return notes2Percentage;
    }

    function getDurations1Percentage() {
        return durations1Percentage;    
    }
    
    function getDurations2Percentage() {
        return durations2Percentage;    
    }
    
    function getTotalPercentage() {
        return totalPercentage;
    }
    
    function evalChord(chordStudent, chordModel) {
        var theReport = '';
        var studentMIDI;
        var correctMIDI;
        //console.log('chordStudent='+chordStudent+' chordModel='+chordModel);
        if(chordStudent.length !== chordModel.length) {
            theReport += ' You entered the wrong number of notes in the chord. ';
        }
        for(var i=0; i<chordModel.length; i++) {
            studentMIDI = noteNameToMIDI(chordStudent[i]);
            correctMIDI = noteNameToMIDI(chordModel[i]);
            if((studentMIDI !== correctMIDI) && ((studentMIDI-12) !== correctMIDI) && ((studentMIDI+12) !== correctMIDI) ) {
                theReport += " chord tone " +(i+1)+ " is incorrect.";
                if(revealAnswers) {
                    theReport += " You entered "+chordStudent[i]+" but the correct note is "+chordModel[i];
                }
            }
        }
        if(theReport !== '') {
            theReport += '\n\n';
        }
        return theReport;
    }

    function checkChordToneNames(chordStudent, chordModel) {
        var studentMIDIArray = [];
        var correctMIDIArray = [];
        var studentBooleanArray = [];
        var correctBooleanArray = [];
        var boolean_correct_student = [];
        
        var i = 0;
        var j = 0;
        var midiClass = 0;
        //console.log('chordStudent='+chordStudent+' chordModel='+chordModel);
        
        for(i=0; i<chordModel.length; i++) {
            midiClass = noteNameToMIDI(chordModel[i]) % 12;
            correctMIDIArray.push(midiClass);
            correctBooleanArray.push(false);
        }
        
        for(i=0; i<chordStudent.length; i++) {
            midiClass = noteNameToMIDI(chordStudent[i]) % 12;
            studentMIDIArray.push(midiClass);
            studentBooleanArray.push(false);
        }
        
        // check to see if all of the chordModel is in the chordStudent
        for(i=0; i<correctMIDIArray.length; i++) {
           for(j=0; j<studentMIDIArray.length; j++) {
               if(correctMIDIArray[i] == studentMIDIArray[j]) {
                   correctBooleanArray[i] = true;
                   break;
               }
           }
        }
        // check to see if all of the chordStudent is in the chordModel
        for(i=0; i<studentMIDIArray.length; i++) {
           for(j=0; j<correctMIDIArray.length; j++) {
               if(studentMIDIArray[i] == correctMIDIArray[j]) {
                   studentBooleanArray[i] = true;
                   break;
               }
           }
        }
        boolean_correct_student.push(correctBooleanArray);
        boolean_correct_student.push(studentBooleanArray);
        return boolean_correct_student;
    }

    function evalChordTones(chordStudent, chordModel) {
        var boolean_arrays = checkChordToneNames(chordStudent, chordModel);
        var boolean_correct = boolean_arrays[0];
        var boolean_student = boolean_arrays[1];
        var report = '';
        var i;
        for(i=0; i<chordModel.length; i++) {
            if(boolean_correct[i] === false) {
                report += '\nThe note '+chordModel[i]+' is not in your chord.'
            }
        }
        for(i=0; i<chordStudent.length; i++) {
            if(boolean_student[i] === false) {
                report += '\nThe note '+chordStudent[i]+' in your chord is incorrect.'
            }
        }
        if(report !== '') {
            report += '\n\n';
        }
        console.log('report='+report);
        return report;
        
    }

    function evalPianoScore(studentJSON, modelJSON) {
        var noteErrorIndexArray = [];
        var restErrorIndexArray = [];
        errorIndexArray = [];
        var noteErrorIndexArray2 = [];
        var restErrorIndexArray2 = [];
        errorIndexArray2 = [];

        var report = '';
        var oneReport = '';
        var oneHandReport = '';
        var numberRHCorrectNotes = 0;
        var numberLHCorrectNotes = 0;
        var numberRHCorrectDurs = 0;
        var numberLHCorrectDurs = 0;
        
        var studentRightHandNotes = studentJSON.notes;
        var studentLeftHandNotes = studentJSON.notes2;
        var studentRightHandDurs = studentJSON.durations;
        var studentLeftHandDurs = studentJSON.durations2;
        var correctRightHandNotes = [];
        var correctLeftHandNotes = [];
        var correctRightHandDurs = modelJSON.durations.split(',');
        var correctLeftHandDurs = modelJSON.durations2.split(',');

        var i=0;
        // get correct right hand notes
        var arrayOfNotes = modelJSON.notes.split(',');
        var len = arrayOfNotes.length;
        for(i=0; i<len; i++) {
            if( arrayOfNotes[i].includes(' ') ) {
                correctRightHandNotes.push( arrayOfNotes[i].split(' ') );
            } else {
                correctRightHandNotes.push( arrayOfNotes[i] );
            }
        }
        // get correct left hand notes
        arrayOfNotes = modelJSON.notes2.split(',');
        len = arrayOfNotes.length;
        for(i=0; i<len; i++) {
            if( arrayOfNotes[i].includes(' ') ) {
                correctLeftHandNotes.push( arrayOfNotes[i].split(' ') );
            } else {
                correctLeftHandNotes.push( arrayOfNotes[i]);
            }
        }

        // evaluate the Right hand note
        report += "Right Hand note evaluation:\n\n";
        for(i=0; i<correctRightHandNotes.length; i++) {
            if(correctRightHandNotes[i] != studentRightHandNotes[i] ) {
                if(typeof(correctRightHandNotes[i]) == 'string') {
                    oneReport = "Note number "+(i+1)+" is incorrect.";
                    oneReport += " You entered "+studentRightHandNotes[i]+" but the correct note is "+correctRightHandNotes[i] + "\\n";
//                } else if(typeof(correctRightHandNotes[i]) == 'object') {
                } else {
//                    oneReport = evalChord(studentRightHandNotes[i], correctRightHandNotes[i]);
                    oneReport = evalChordTones(studentRightHandNotes[i], correctRightHandNotes[i]);
                    if(oneReport !== "") {
                        oneReport = 'Chord number '+(i+1)+' is incorrect, ' + oneReport   
                    }
                }
            }
            if(oneReport == "") {
                numberRHCorrectNotes++;            
            } else {
                oneHandReport += oneReport;
//                report += oneReport;
                noteErrorIndexArray.push(i);
            }
            oneReport = '';
        }
        if(oneHandReport !== "") {
            report += oneHandReport;
        } else {
            report += "All Correct.\n\n";
        }
        oneHandReport = '';

        // evaluate the Right hand Durations
        report += "Right Hand duration evaluation:\n\n";
        for(i=0; i<correctRightHandDurs.length; i++) {
            if(correctRightHandDurs[i] != studentRightHandDurs[i] ) {
                restErrorIndexArray.push(i);
                oneReport = "The duration of entry number "+(i+1)+" is incorrect.";
                oneReport += " You entered "+studentRightHandDurs[i]+" but the correct duration is "+correctRightHandDurs[i] + "\n\n";
            }
            if(oneReport == "") {
                numberRHCorrectDurs++;            
            } else {
                oneHandReport += oneReport;
//                report += oneReport; // + "\n\n";
            }
            oneReport = '';
        }
        if(oneHandReport !== "") {
            report += oneHandReport;
        } else {
            report += "All Correct.\n\n";
        }
        oneHandReport = '';

        // evaluate the Left hand notes
        report += "Left Hand note evaluation:\n\n";
        for(i=0; i<correctLeftHandNotes.length; i++) {
            if(correctLeftHandNotes[i] != studentLeftHandNotes[i] ) {
                if(typeof(correctLeftHandNotes[i]) == 'string') {
                    oneReport = "note number "+(i+1)+" is incorrect.";
                    oneReport += " You entered "+studentLeftHandNotes[i]+" but the correct note is "+correctLeftHandNotes[i] + "\n\n";
                } else {
//                    oneReport = evalChord(studentLeftHandNotes[i], correctLeftHandNotes[i]);
                    oneReport = evalChordTones(studentLeftHandNotes[i], correctLeftHandNotes[i]);
                }
            }
            if(oneReport == "") {
                numberLHCorrectNotes++;            
            } else {
                oneHandReport += oneReport;
//                report += oneReport; // + "\n\n";
                noteErrorIndexArray2.push(i);
            }
            oneReport = '';
        }
        if(oneHandReport !== "") {
            report += oneHandReport;
        } else {
            report += "All Correct.\n\n";
        }
        oneHandReport = '';

        // evaluate the Left hand Durations
        report += "Left Hand duration evaluation:\n\n";
        for(i=0; i<correctLeftHandDurs.length; i++) {
            if(correctLeftHandDurs[i] != studentLeftHandDurs[i] ) {
                oneReport = "The duration of entry number "+(i+1)+" is incorrect.";
                oneReport += " You entered "+studentLeftHandDurs[i]+" but the correct duration is "+correctLeftHandDurs[i] + "\n\n";
                restErrorIndexArray2.push(i);
            }
            if(oneReport == "") {
                numberLHCorrectDurs++;            
            } else {
                oneHandReport += oneReport;
//                report += oneReport; // + "\n\n";
            }
            oneReport = '';
        }
        if(oneHandReport !== "") {
            report += oneHandReport;
        } else {
            report += "All Correct.\n\n";
        }
        oneHandReport = '';

        if(noteErrorIndexArray.length>0 || restErrorIndexArray.length>0) {
            errorIndexArray.push(noteErrorIndexArray);
            errorIndexArray.push(restErrorIndexArray);
        } else {
            errorIndexArray = undefined;
        }
        if(noteErrorIndexArray2.length>0 || restErrorIndexArray2.length>0) {
            errorIndexArray2.push(noteErrorIndexArray2);
            errorIndexArray2.push(restErrorIndexArray2);
        } else {
            errorIndexArray2 = undefined;
        }

        var RHNoteScore = (numberRHCorrectNotes/correctRightHandNotes.length)*100;
        report += "Right hand: note score = "+ Number.parseFloat(RHNoteScore).toFixed(2) +"%";
        var RHDurScore = (numberRHCorrectDurs/correctRightHandDurs.length)*100;
        report += " duration score = "+ Number.parseFloat(RHDurScore).toFixed(2) +"%\n\n";

        var LHNoteScore = (numberLHCorrectNotes/correctLeftHandNotes.length)*100;
        report += "Left hand: note score = "+ Number.parseFloat(LHNoteScore).toFixed(2) +"%";
        var LHDurScore = (numberLHCorrectDurs/correctLeftHandDurs.length)*100;
        report += " duration score = "+ Number.parseFloat(LHDurScore).toFixed(2) +"%\n\n";
        
        var totalScore = (RHNoteScore + LHNoteScore + RHDurScore + LHDurScore)/4;
        report += 'Overall Score = '+ Number.parseFloat(totalScore).toFixed(2) + '%\n\n';        

        notes1Percentage = Number.parseFloat(RHNoteScore).toFixed(2);
        durations1Percentage = Number.parseFloat(RHDurScore).toFixed(2);
        notes2Percentage = Number.parseFloat(LHNoteScore).toFixed(2);
        durations2Percentage = Number.parseFloat(LHDurScore).toFixed(2);
        totalPercentage = Number.parseFloat(totalScore).toFixed(2);
//        console.log('(2) totalPercentage='+totalPercentage);

        return report;
    }
        
    function highlightNoteAndStem(color) {
        var myColor = (color !== undefined)? color: "#red";
        if(myColor[0] != '#') {
            myColor = "#"+myColor;
        }
        return '\\override NoteHead.color = '+myColor+' \\override Stem.color = '+myColor+' \\override Accidental.color = '+myColor;
    }
    
    function highlightRest(color) {
        var myColor = (color !== undefined)? color: "#red";
        if(myColor[0] != '#') {
            myColor = "#"+myColor;
        }
        return '\\override Staff.Rest.color = '+myColor;
    }

    function generateReport() {
        var student = makeAssignmentJSON();
        console.log('student.assignment='+student.assignment);
        var model = loadModelAnswerJSON(student.assignment);
        console.log('model.assignment='+model.assignment);
        var myReport = evalStudentAnswers(student, model);
        return myReport;
    }

    function appendReportToLilyFile(theReport) {
        var appendage = '\\markup {\n  \\wordwrap-string #"\n';
        appendage += theReport +'"\n}';;
        return appendage;

    }

    var AssignmentNameToIndex = {
        'Assignment 1': 0,
        'Assignment 2': 1,
        'Assignment 3': 2,
        'Assignment 4': 3,
        'Assignment 5': 4,
        'Assignment 6': 5,
        'Assignment 7': 6,
        'Assignment 8': 7,
        'Assignment 9': 8,

        'Assignment 01': 0,
        'Assignment 02': 1,
        'Assignment 03': 2,
        'Assignment 04': 3,
        'Assignment 05': 4,
        'Assignment 06': 5,
        'Assignment 07': 6,
        'Assignment 08': 7,
        'Assignment 09': 8,

        'Assignment 10': 9,
        'Assignment 11': 10,
        'Assignment 12': 11,
        'Assignment 13': 12,
        'Assignment 14': 13,
        'Assignment 15': 14,
        'Assignment 16': 15,
        'Assignment 17': 16,
        'Assignment 18': 17,
        'Assignment 19': 18,
        'Assignment 20': 19,
        'Assignment 21': 20,
        'Assignment 22': 21,
        'Assignment 23': 22,
        'Assignment 24': 23,
        'Assignment 25': 24,
    }

var MIDI_SHARP_NAMES = ['B#_0',  'C#_1', 'Cx_1', 'D#_1',   'E_1',  'E#_1',  'F#_1', 'Fx_1',  'G#_1', 'Gx_1', 'A#_1', 'B_1',
                    'B#_1', 'C#0', 'Cx0', 'D#0', 'E0', 'E#0', 'F#0', 'Fx0', 'G#0', 'Gx0', 'A#0', 'B0',
                    'B#0', 'C#1', 'Cx1', 'D#1', 'E1', 'E#1', 'F#1', 'Fx1', 'G#1', 'Gx1', 'A#1', 'B1',
                    'B#1', 'C#2', 'Cx2', 'D#2', 'E2', 'E#2', 'F#2', 'Fx2', 'G#2', 'Gx2', 'A#2', 'B2',
                    'B#2', 'C#3', 'Cx3', 'D#3', 'E3', 'E#3', 'F#3', 'Fx3', 'G#3', 'Gx3', 'A#3', 'B3',
                    'B#3', 'C#4', 'Cx4', 'D#4', 'E4', 'E#4', 'F#4', 'Fx4', 'G#4', 'Gx4', 'A#4', 'B4',
                    'B#4', 'C#5', 'Cx5', 'D#5', 'E5', 'E#5', 'F#5', 'Fx5', 'G#5', 'Gx5', 'A#5', 'B5',
                    'B#5', 'C#6', 'Cx6', 'D#6', 'E6', 'E#6', 'F#6', 'Fx6', 'G#6', 'Gx6', 'A#6', 'B6',
                    'B#6', 'C#7', 'Cx7', 'D#7', 'E7', 'E#7', 'F#7', 'Fx7', 'G#7', 'Gx7', 'A#7', 'B7',
                    'B#7', 'C#8', 'Cx8', 'D#8', 'E8', 'E#8', 'F#8', 'Fx8', 'G#8', 'Gx8', 'A#8', 'B8',
                    'B#8', 'C#9', 'Cx9', 'D#9', 'E9', 'E#9', 'F#9', 'Fx9'];
                          

var MIDI_FLAT_NAMES = ['C_1', 'Db_1', 'D_1', 'Eb_1', 'Fb_1', 'F_1', 'Gb_1', 'G_1', 'Ab_1', 'A_1', 'Bb_1', 'Cb0',
                    'C0', 'Db0', 'D0', 'Eb0', 'Fb0', 'F0', 'Gb0', 'G0', 'Ab0', 'A0', 'Bb0', 'Cb1',
                    'C1', 'Db1', 'D1', 'Eb1', 'Fb1', 'F1', 'Gb1', 'G1', 'Ab1', 'A1', 'Bb1', 'Cb2',
                    'C2', 'Db2', 'D2', 'Eb2', 'Fb2', 'F2', 'Gb2', 'G2', 'Ab2', 'A2', 'Bb2', 'Cb3',
                    'C3', 'Db3', 'D3', 'Eb3', 'Fb3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'Cb4',
                    'C4', 'Db4', 'D4', 'Eb4', 'Fb4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'Cb5',
                    'C5', 'Db5', 'D5', 'Eb5', 'Fb5', 'F5', 'Gb5', 'G5', 'Ab5', 'A5', 'Bb5', 'Cb6',
                    'C6', 'Db6', 'D6', 'Eb6', 'Fb6', 'F6', 'Gb6', 'G6', 'Ab6', 'A6', 'Bb6', 'Cb7',
                    'C7', 'Db7', 'D7', 'Eb7', 'Fb7', 'F7', 'Gb7', 'G7', 'Ab7', 'A7', 'Bb7', 'Cb8',
                    'C8', 'Db8', 'D8', 'Eb8', 'Fb8', 'F8', 'Gb8', 'G8', 'Ab8', 'A8', 'Bb8', 'Cb9',
                    'C9', 'Db9', 'D9', 'Eb9', 'Fb9', 'F9', 'Gb9', 'G9'];
                    


var MIDI_OTHER_NAMES = ['Dbb_1', 'Bx_0', 'Ebb_1', 'Fbb_1', 'Dx_1', 'Gbb_1', 'Ex_1', 'Abb_1', 'Ab_1', 'Bbb_1', 'Cbb0', 'Ax_1',
                    'Dbb0', 'Bx_1', 'Ebb0', 'Fbb0', 'Dx0', 'Gbb0', 'Ex0', 'Abb0', 'Ab0', 'Bbb0', 'Cbb1', 'Ax0',
                    'Dbb1', 'Bx0', 'Ebb1', 'Fbb1', 'Dx1', 'Gbb1', 'Ex1', 'Abb1', 'Ab1', 'Bbb1', 'Cbb2', 'Ax1',
                    'Dbb2', 'Bx1', 'Ebb2', 'Fbb2', 'Dx2', 'Gbb2', 'Ex2', 'Abb2', 'Ab2', 'Bbb2', 'Cbb3', 'Ax2',
                    'Dbb3', 'Bx2', 'Ebb3', 'Fbb3', 'Dx3', 'Gbb3', 'Ex3', 'Abb3', 'Ab3', 'Bbb3', 'Cbb4', 'Ax3',
                    'Dbb4', 'Bx3', 'Ebb4', 'Fbb4', 'Dx4', 'Gbb4', 'Ex4', 'Abb4', 'Ab4', 'Bbb4', 'Cbb5', 'Ax4',
                    'Dbb5', 'Bx4', 'Ebb5', 'Fbb5', 'Dx5', 'Gbb5', 'Ex5', 'Abb5', 'Ab5', 'Bbb5', 'Cbb6', 'Ax5',
                    'Dbb6', 'Bx5', 'Ebb6', 'Fbb6', 'Dx6', 'Gbb6', 'Ex6', 'Abb6', 'Ab6', 'Bbb6', 'Cbb7', 'Ax6',
                    'Dbb7', 'Bx6', 'Ebb7', 'Fbb7', 'Dx7', 'Gbb7', 'Ex7', 'Abb7', 'Ab7', 'Bbb7', 'Cbb8', 'Ax7',
                    'Dbb8', 'Bx7', 'Ebb8', 'Fbb8', 'Dx8', 'Gbb8', 'Ex8', 'Abb8', 'Ab8', 'Bbb8', 'Cbb9', 'Ax8',
                    'Dbb9', 'Bx8', 'Ebb9', 'Fbb9', 'Dx9', 'Gbb9', 'Ex9', 'Abb9'];
                    

function noteNameToMIDI(noteName)  {
    var i;
    var MIDInumber = -1; // default if not found
    for(i=0; i < MIDI_SHARP_NAMES.length; i++) {
        if( noteName == MIDI_SHARP_NAMES[i] ||
                noteName == MIDI_FLAT_NAMES[i] ||
                    noteName == MIDI_OTHER_NAMES[i] ) {
        
            MIDInumber = i;  // found it
        }
    }
    return MIDInumber;
}


    return {
        createLilyPondFile: createLilyPondFile,
        setScoreParameters: setScoreParameters,
        setGrandStaffScoreParameters: setGrandStaffScoreParameters,
        setChoraleScoreParameters: setChoraleScoreParameters,
        setCPMelodyParameters: setCPMelodyParameters,
        translateLilyToToneJS: translateLilyToToneJS,
        lilyPickupMeasure: lilyPickupMeasure,
        getLilyEntryScoreParams: getLilyEntryScoreParams,
        generateReport: generateReport,
        appendReportToLilyFile: appendReportToLilyFile,
        chordsContainSamePitchNames: chordsContainSamePitchNames,
        getNotes1Percentage: getNotes1Percentage,
        getNotes2Percentage: getNotes2Percentage,
        getDurations1Percentage: getDurations1Percentage,
        getDurations2Percentage: getDurations2Percentage,
        getTotalPercentage: getTotalPercentage
    };
    
})();

/*-------------------------------------------------------------------------------
var someNotes = ['C4','D4','E4','F4','G4','Bb4','D5','C5'];	
var someDurations = ['4n','8n','8n','8r','8n','16n','16n','8r','8n','8n'];

var joyLily = "//relative c' { a'4 gis8. fis16 e4. d8 cis4 b4 a4. e'8 fis4. fis8 gis4. gis8 a1 }"
var joyPitches = ['A4','G#4','F#4','E4','D4','C#4','B3','A3','E4','F#4','F#4','G#4','G#4','A4'];
var joyDurations = ['4n','d8n','16n','d4n','8n','4n','4n','d4n','8n','d4n','8n','d4n','8n','1n'];

//var mariaPitches = ["Eb4","A4","Bb4","Eb4","A4","Bb4","C5","A4","Bb4","C5","A4","Bb4","Bb4","A4","G4","F4","Eb4","F4","Bb4","Ab4","G4","F4","Eb4","F4","Eb4","G4"];
//var mariaDurations = ["8n","8n","2n + 4n","8n","4t","4t","4t","4t","4t","4t","8n","2n + 4n","8n","8n","8n","8n","8n","4n + 8n","8n","8n","8n","8n","8n","4n","4n","2n"];

var mariaLily = "";
var mariaPitches = ["Eb4","A4","Bb4","Eb4","A4","Bb4","C5","A4","Bb4","C5","A4","Bb4","Bb4","A4","G4","F4","Eb4","F4","Bb4","Ab4","G4","F4","Eb4","F4","Eb4","G4",
"Eb4","A4","Bb4","Eb4","A4","Bb4","C5","A4","Bb4","C5",
"D5","Bb4","D5","Eb5","D5","C5","Bb4","D5","D5","Eb5","D5","C5","Bb4","D5","Eb5","F5"];

var mariaDurations = ["8n","8n","2n + 4n","8n","4t","4t","4t","4t","4t","4t","8n","2n + 4n","8n","8n","8n","8n","8n","4n + 8n","8n","8n","8n","8n","8n","4n","4n","2n + 4n + 8n","8n","8n","2n + 4n","8n","4t","4t","4t","4t","4t","4t","8n","2n + 4n","8n","8n","8n","8n","8n","4n + 8n","8n","8n","8n","8n","8n","4n","4n","2n + 4n + 8n"];

var mountainKingLily = "//relative c' { e8 fis g a b g b4 bes8 ges bes4 a8 f a4 e8 fis g a b g b e d b g b d2 e8 fis g a b g b4 bes8 ges bes4 a8 f a4 e8 fis g a b g b e dis b dis fis e2}";
var mountainKingNotes = ['E3','F#3','G3','A3','B3','G3','B3','Bb3','Gb3','Bb3','A3','F3','A3','E3','F#3','G3','A3','B3','G3','B3','E4','D4','B3','G3','B3','D4','E3','F#3','G3','A3','B3','G3','B3','Bb3','Gb3','Bb3','A3','F3','A3','E3','F#3','G3','A3','B3','G3','B3','E4','D#4','B3','D#4','F#4','E4'];
var mountainKingDurs = ['8n','8n','8n','8n','8n','8n','4n','8n','8n','4n','8n','8n','4n','8n','8n','8n','8n','8n','8n','8n','8n','8n','8n','8n','8n','2n','8n','8n','8n','8n','8n','8n','4n','8n','8n','4n','8n','8n','4n','8n','8n','8n','8n','8n','8n','8n','8n','8n','8n','8n','8n','2n'];
var jsonConfig = {
    "keySig":"e \\minor",
    "clef":"bass",
    "timeSig":"4/4",
    "name":"In the Hall of the Mountain King",
    "notes":mountainKingNotes,
    "durations":mountainKingDurs,
    "pickup":"",
    "tempo":' \"moderato\" 4 = 90'
};

lpAdapter.setScoreParameters(jsonConfig);
var lilyFile = lpAdapter.createLilyPondFile(false);
console.log(lilyFile);
var divName = 'lilyDiv';
var lilyCodeDiv = document.getElementById(divName);
lilyCodeDiv.innerHTML = lilyFile;

// console.log(lpAdapter.createLilyPondFile(false) );

--------------------------------------------------------------------*/
