var curPreloader=false;
var curWidth=128;
var curHeight=128;
var curFramesAmount=12;
var allowShowList=true;
var allowHideList=true;
var allowHideLang=true;
var imageTimeout=false;
var allowHideTip=true;
var generateTimeout=false;
var allowChangeSize=false;
var curStore=false;
var cLastTop=0;
var cWidth=128;
var cHeight=128;
var maxSpeed=16;
var minSpeed=2;
var defaultSpeed=9;
var pickerOffsetLeft=140;
var pickerOffsetTop=80;
var curPreviewBack='FFFFFF';

$(document).ready(function(){
	//forecolor
    options={};
    options.onChange=function(hsb, hex, rgb){
        $('#foreColorP').css('background', '#'+hex);
        $('#foreColor').val(hex.toUpperCase());
    }
	
    options.color='000000';

	//backcolor
    $('#foreColor').ColorPicker(options);

    options={};
    options.color='FFFFFF';
    options.onChange=function(hsb, hex, rgb){
        $('#backColorP').css('background', '#'+hex);
        $('#backColor').val(hex.toUpperCase());
    }
    $('#backColor').ColorPicker(options);

	//preview background
    options={};
    options.color='FFFFFF';
    options.onChange=function(hsb, hex, rgb){
        $('.generator_content').css('background', '#'+hex);
		curPreviewBack=hex;
    }
    $('.colorful').ColorPicker(options);

    $('#foreColorP').click(function(){
        $('#foreColor').click();
    });

    $('#backColorP').click(function(){
        $('#backColor').click();
    });
	
	$('#foreColor, #backColor, #foreColorP, #backColorP').mouseover(function(){
		pickerOffsetLeft=140;
		pickerOffsetTop=80;
	});
	
	$('.colorful').mouseover(function(){
		pickerOffsetLeft=166;
		pickerOffsetTop=10;
	});
	
	//CHANGES HERE
	$('.language_select').click(function(){
		if($('.language_dropdown').is(':hidden')){
			$('.language_dropdown').show();
		}
		else{
			$('.language_dropdown').hide();
		}
	});
	
	$('.language_select').mouseover(function(){
		allowHideLang=false;
	}).mouseout(function(){
		allowHideLang=true;
	});
	//CHANGES END HERE
    

    //INITIALIZING PRELOADER SELECTION
    $('.preloaders').mouseover(function(){
        allowHideList=false;
    }).mouseout(function(){
		allowHideList=true;
	});

    $('.preloaders').click(function(){
		if($('.preloaders_list').is(':hidden') && allowShowList)
            $('.preloaders_list').show();
        else
            $('.preloaders_list').hide();
    });

    $('.preloader').click(function(){
        $('.preloaders_list').hide();
        curPreloader=$(this).children('img').attr('title').split(': ');
		curPreloader=curPreloader[0];
		curWidth=pinfo[curPreloader][0];
		curHeight=pinfo[curPreloader][1];
		curFramesAmount=pinfo[curPreloader][2];
		curStore=pinfo[curPreloader][3];
		
		$('#width').val(curWidth);
		$('#height').val(curHeight);
		$('#framesAmount').val(curFramesAmount);
		
        var src=$(this).children('img').attr('src');
        allowShowList=false;
        $('.preloaders .selection_box').html('<img src="'+src+'" />');
		if(pinfo[curPreloader][4]){
			$('.words').show();
			if(location.href.indexOf('letters_numbers_words')!=-1)
				$('#word').keyup();
		}
		else{
			$('.words').hide();
		}
		
		
    });

	$('body').append('<iframe style="display:none" id="generatorFrame"></iframe>');
	
    $('body').mousemove(function(info){
        allowShowList=true;
		if(allowHideTip)
			$('.help').children().hide();
		if(allowChangeSize){
			var o=Math.round((info.pageY-cLastTop)/5);
			var wo=cWidth-o;
			var ho=cHeight-o;
			
			if(wo<5)
				wo=5;
			else if(wo>256)
				wo=256;
			
			ho=Math.round(wo*cHeight/cWidth);
				
			$('#width').val(wo);
			$('#height').val(ho);
		}
    }).click(function(){
        if(allowHideList){$('.preloaders_list').hide();}
		if(allowHideLang){$('.language_dropdown').hide();}
    }).mouseup(function(){
		allowChangeSize=false;
		$('body').enableSelection();
	});

    //INITIALIZING GENERATOR FUNCTIONS

    $('.generate_button').click(function(){
		$('#downloadOptions').hide();
		$('.ad').remove();
        generatePreloader(false, $('#sliderValue5h').val(), $('#foreColor').val(), $('#backColor').val(), $('#width').val(), $('#height').val(), $('#backTranspYes').is(':checked'),  $('#reverseYes').is(':checked'), $('#origColorsYes').is(':checked'),  $('#grayTranspYes').is(':checked'), $('#imageTypeGif').is(':checked'), $('#inverseColorsYes').is(':checked'), $('#flipHor').is(':checked'), $('#flipVert').is(':checked'), $('#framesAmount').val(), $('#wordTransformed').val());
    });

    //INITIALIZING PREVIEW BACKGROUND SETTINGS
    $('.content .preview_back div').click(function(){
		if(!$(this).hasClass('colorful')){
			var back=$(this).css('background-image');
			if(back=='none')
			   back=$(this).css('background-color');
		}
		else{
			back='#'+curPreviewBack;
		}

        $('.generator .generator_content').css('background', back);
    });

    //PLACING FORM SETTINGS
	$('#origColorsYes').click(function(){
		$('.parameters .pr.fc .pr_overlay').fadeIn();
		$('.parameters .pr.gtt .pr_overlay').fadeIn();
	});
	$('#origColorsNo').click(function(){
		$('.parameters .pr.fc .pr_overlay').hide();
		$('.parameters .pr.gtt .pr_overlay').hide();
	});
	
    $('#imageTypeGif').click(function(){
        $('.parameters .pr.bc .pr_overlay').hide();
    });

    $('#imageTypePng').click(function(){
        if($('#backTranspYes').is(':checked'))
            $('.parameters .pr.bc .pr_overlay').fadeIn();
    });

    $('#backTranspYes').click(function(){
        if($('#imageTypePng').is(':checked')){
            $('.parameters .pr.bc .pr_overlay').fadeIn();
        }
    });

    $('#backTranspNo').click(function(){
            $('.parameters .pr.bc .pr_overlay').hide();
    });

    $('#foreColor').click(function(){
        $('#foreColorP').click();
    });
	
	$('#foreColor').blur(function(){
		$('#foreColorP').css('background', '#'+$('#foreColor').val());
	});
	
	$('#backColor').blur(function(){
		$('#backColorP').css('background', '#'+$('#backColor').val());
	});
	
	$('#width').keyup(function(){
		if($('#constrain').is(':checked')){
			$('#height').val(Math.round($(this).val()*curHeight/curWidth));
		}
	});
	
	$('#height').keyup(function(){
		if($('#constrain').is(':checked')){
			$('#width').val(Math.round($(this).val()*curWidth/curHeight));
		}
	});
	
	//overlay clicks
	$('.parameters .pr.fc .pr_overlay').click(function(){
		alert('Set "Keep originial colors" (in the advanced options) to "NO" to enable this feature');
	});
	
	$('.parameters .pr.gtt .pr_overlay').click(function(){
		alert('Set "Keep originial colors" to "NO" to enable this feature');
	});
	
	$('.parameters .pr.bc .pr_overlay').click(function(){
		alert('Set "transparent background" to "NO" and/or ".PNG" image type to ".GIF" to enable this feature');
	});
	
	$('#advanced').click(function(){
		if($('#advancedOptions').is(':hidden')){
			$(this).css('background-image', 'url(/images/advanced_up.gif)');
		}
		else{
			$(this).css('background-image', 'url(/images/advanced_down.gif)');
		}
		
		$('#advancedOptions').animate({height:'toggle', opacity:'toggle'});
		
	});
	
	$('.help').mouseover(function(){
		$(this).children().fadeIn('fast');
		allowHideTip=false;
	});
	
	$('.help').mouseout(function(){
		$(this).children().hide();
		allowHideTip=true;
	});
	
	$('#generatorFrame').attr('src', '');
	
	var settingsCookie=getCookie('formSettings');
	//alert(settingsCookie);return;
	if(settingsCookie && settingsCookie!='null'){
		var settings=settingsCookie.split('[-]');
		
		$('#sliderValue5h').val(settings[0]);
		$('#sliderValue5h').change();
		
		
		$('#foreColor').val(settings[1]);
		$('#foreColorP').css('background-color', '#'+settings[1]);
		$('#backColor').val(settings[2]);
		$('#backColorP').css('background-color', '#'+settings[2]);
		
		if(settings[3]=='1'){
			$('#backTranspYes').click();
		}
		else{
			$('#backTranspNo').click();
		}
		
		if(settings[4]=='1'){
			$('#reverseYes').click();
		}
		else{
			$('#reverseNo').click();
		}
		
		if(settings[5]=='1'){
			$('#origColorsYes').click();
		}
		else{
			$('#origColorsNo').click();
		}
		
		if(settings[6]=='1'){
			$('#grayTranspYes').click();
		}
		else{
			$('#grayTranspNo').click();
		}
		
		if(settings[7]=='1'){
			$('#imageTypeGif').click();
		}
		else{
			$('#imageTypePng').click();
		}
		
		if(settings[8]=='1'){
			$('#inverseColorsYes').click();
		}
		else{
			$('#inverseColorsNo').click();
		}
		
		if(settings[9]=='1'){
			$('#flipHor').attr('checked', true);
			$('#flipVert').attr('checked', false);
		}
		else if(settings[9]=='2'){
			$('#flipVert').attr('checked', true);
			$('#flipHor').attr('checked', false);
		}
		else if(settings[9]=='3'){
			$('#flipHor').attr('checked', true);
			$('#flipVert').attr('checked', true);
		}
		else{
			$('#flipHor').attr('checked', false);
			$('#flipVert').attr('checked', false);
		}
		
		if(settings[10]=='1'){
			$('#constrain').attr('checked', true);
		}
		else{
			$('#constrain').attr('checked', false);
		}
		
		if(settings[11]=='1'){
			$('#genAutoYes').click();
		}
		else{
			$('#genAutoNo').click();
		}
		
		if(settings[12]!='' && settings[13]!=''){
			$('.generator_content').css('background-color', settings[12]);
			$('.generator_content').css('background-image', settings[13]);
			
		}
	}
	
	$('#resetForm').click(function(){
		
		$('#sliderValue5h').val(defaultSpeed);
		$('#sliderValue5h').change();
		
		
		$('#foreColor').val('000000');
		$('#foreColorP').css('background-color', '#000000');
		$('#backColor').val('FFFFFF');
		$('#backColorP').css('background-color', '#FFFFFF');
		
		$('#backTranspNo').click();
		$('#reverseNo').click();
		$('#origColorsNo').click();
		$('#grayTranspNo').click();
		$('#imageTypeGif').click();
		$('#inverseColorsNo').click();
		$('#flipHor').attr('checked', false);
		$('#flipVert').attr('checked', false);
		$('#constrain').attr('checked', true);
		$('#width').blur();
		setCookie('formSettings', null, null);
	});
	
	$('#constrain').click(function(){
		if($(this).is(':checked'))
			$('#width').blur();
	});
	
	$('.reset_sizes').click(function(){
		$('#width').val(curWidth);
		$('#height').val(curHeight);
	});
	
	$('.logo').click(function(){
		var l=lang;
		if(lang=='en')
			l='';
		location.href='/'+l;
	});
	
	$('.preloader, #imageTypeGif, #imageTypePng, #backTranspYes, #backTranspNo, #constrain, #origColorsYes, #origColorsNo, #inverseColorsYes, #inverseColorsNo, #flipHor, #flipVert, #grayTranspYes, #grayTranspNo, #reverseYes, #reverseNo').click(function(){
		new autoGenerate();
	});
	
	$('#width, #height, #framesAmount').keyup(function(){
		new autoGenerate();
	});
	
	$('#moveAdRight').click(function(){
		var m=parseInt($('#bBlocks').css('margin-left'));
		m-=313;
		
		$('#bBlocks').animate({marginLeft:m+'px'}, 500, function(){
			if(m<-1100){
				$('#bBlocks').css('margin-left', '0px');
			}
		});
	});
	
	$('#moveAdLeft').click(function(){
		var m=parseInt($('#bBlocks').css('margin-left'));
		
		if(m>-100){
			$('#bBlocks').css('margin-left', '-1252px');
			m=-939;
		}
		else{
			m+=313;
		}
			
		$('#bBlocks').animate({marginLeft:m+'px'}, 500);
	});
	
	$('.reply').click(function(){
		$('#messageForm').appendTo($(this).parent().parent());
		$('#replyTo').val($(this).attr('id').substr(6));
	});
	
	$('.approve').click(function(){
		$('#messageAction').val('approve');
		$('#messagePostId').val($(this).attr('id').substr(8));
		$('#aDForm').submit();
	});
	
	$('.delete').click(function(){
		if(confirm('Are you sure you want to delete this post?')){
			$('#messageAction').val('delete');
			$('#messagePostId').val($(this).attr('id').substr(7));
			$('#aDForm').submit();
		}
	});	
	
	
	$('.hidey, .showey').click(function(){
		if($('.hidey').is(':hidden')){
			$('.hidey').show();
			$('.showey').hide();
		}
		else{
			$('.hidey').hide();
			$('.showey').show();
			
		}
	
		$('.bottom_b div, .ad').animate({height:'toggle'}, 300);
	});
		
	$('.size_slider').mousedown(function(info){
		cLastTop=info.pageY;
		allowChangeSize=true;
		cWidth=$('#width').val();
		cHeight=$('#height').val();
		$('body').disableSelection();
	});
	
	//SETTING WORD ENTERING
	$('#word').keyup(function(){
		var wordRE=/^([a-zA-z0-9 \./<>\?;:"'!@#\$%\^&*\(\)\[\]\{\}_\+=-|\\])+$/
		if(!wordRE.test($('#word').val()) || $('#word').val().indexOf('`')!=-1){
			$('.generator .generator_content').html('<div class="message err">'+texts[4]+'</div>');
			return;
		}
		else if($('.generator .generator_content').html().indexOf('message err')!=-1) {
			$('.generator .generator_content').html('');
		}
		
		var text=$(this).val();
		var transformedText='';
		
		var array = {'_':'(underscore)','\\\(':'(left_bracket)','\\\)':'(right_bracket)','A':'(ac)','B':'(bc)','C':'(cc)','D':'(dc)','E':'(ec)','F':'(fc)','G':'(gc)','H':'(hc)','I':'(ic)','J':'(jc)','K':'(kc)','L':'(lc)','M':'(mc)','N':'(nc)','O':'(oc)','P':'(pc)','Q':'(qc)','R':'(rc)','S':'(sc)','T':'(tc)','U':'(uc)','V':'(vc)','W':'(wc)','X':'(xc)','Y':'(yc)','Z':'(zc)','&':'(ampersand)','@':'(at_sign)','\\\\':'(backslash)',':':'(colon)',',':'(comma)','-':'(dash)','\\\$':'(dollar)','\\\.':'(dot)','"':'(double_quote)','=':'(equality)','!':'(exclamation_mark)','\\\^':'(exponent_mark)','/':'(forward_slash)','{':'(left_curly_bracket)','\\\[':'(left_square_bracket)','<':'(less_sign)','>':'(more_sign)','%':'(percent)','\\\+':'(plus)','\\\?':'(question_mark)','\'':'(quote)','}':'(right_curly_bracket)','\\\]':'(right_square_bracket)',';':'(semicolon)','#':'(sharp)','\\\*':'(star)','~':'(tilda)',' ':'(space)'};

		transformedText=text;
		for (var val in array)
			transformedText = transformedText.replace(new RegExp(val, "g"), array[val]);
		
		transformedText=transformedText.replace(/\(left_bracket\(right_bracket\)/g, '(left_bracket)').replace(/\(left_bracket\)underscore\(right_bracket\)/g, '(underscore)');

		$('#wordTransformed').val(transformedText);
		
		var textWidth=0;
		var splittedText=text.split('');
		
		for(i=0; i<splittedText.length; i++){
			textWidth+=pSymbols[splittedText[i]];
		}
		
		$('#height').val(Math.ceil(128*$('#width').val()/textWidth));
		
		
		curWidth=$('#width').val();
		curHeight=$('#height').val();
		
		//str.replace(/A/g, "a");
	});
	
	//replacing radiobuttons
	$('.pr2 input[type=radio]').each(function(){
		var h=$(this).next('label').html();
		$(this).next('label').html('<div class="radio'+($(this).is(':checked')?' active':'')+'" id="'+$(this).attr('id')+'Radio"><div></div></div>'+h);
		$(this).addClass('hidden');
	});
	
	$('.pr2 input[type=radio], .radio').click(function(){
		$('.pr2 input[type=radio]').each(function(){
			var cId=$(this).attr('id')+'Radio';
			if($(this).is(':checked')){
				$('#'+cId).addClass('active');
			}
			else{
				$('#'+cId).removeClass('active');
			}
		});
	});
	
	$('.radio').click(function(){
		var rId=$(this).attr('id').replace('Radio', '');
		$('#'+rId).click();
	});
	
	$('.pr2 input[type=radio]').focus(function(){
		var cId=$(this).attr('id')+'Radio';
		$('#'+cId).addClass('focused');
	}).blur(function(){
		var cId=$(this).attr('id')+'Radio';
		$('#'+cId).removeClass('focused');
	});
	
	//replacing checkboxes
	$('.pr input[type=checkbox]').each(function(){
		var h=$(this).next('label').html();
		$(this).next('label').html('<div class="checkbox'+($(this).is(':checked')?' active':'')+($(this).hasClass('inactive')?' inactive':'')+'" id="'+$(this).attr('id')+'Checkbox"><div></div></div>'+h);
		$(this).addClass('hidden');
	});
	
	$('.pr input[type=checkbox]').click(function(){
		var cId=$(this).attr('id')+'Checkbox';
		
		if($(this).is(':checked')){
			$('#'+cId).addClass('active');
		}
		else{
			$('#'+cId).removeClass('active');
		}
	});	
	
	$('.pr input[type=checkbox]').focus(function(){
		var cId=$(this).attr('id')+'Checkbox';
		$('#'+cId).addClass('focused');
	}).blur(function(){
		var cId=$(this).attr('id')+'Checkbox';
		$('#'+cId).removeClass('focused');
	});
	
	//Setting sprites feature
	$('#downloadSprites').click(function(){
		if($(this).is(':checked')){
			$('#animateJSCheckbox').removeClass('inactive');
			$('#animateCanvasCheckbox').removeClass('inactive');
		}
		else{
			$('#animateJSCheckbox').addClass('inactive');
			$('#animateCanvasCheckbox').addClass('inactive');
		}
	});
	
	if(location.href.indexOf('letters_numbers_words')!=-1)
		$('#word').keyup();
	
	$('.parameters_overlay').fadeOut();
	
	$('.dialog_box .dialog-close, .page_overlay').click(function(){
		$('.dialog_box, .page_overlay').fadeOut(300);
	});
	
	$('.show-dialog-box').click(function(){
		$('.dialog_box, .page_overlay').fadeIn(300);
	});

	$.fn.disableSelection = function() {
		return this.each(function() {           
			$(this).attr('unselectable', 'on')
				   .css({'-moz-user-select':'none',
						'-o-user-select':'none',
						'-khtml-user-select':'none',
						'-webkit-user-select':'none',
						'-ms-user-select':'none',
						'user-select':'none'})
				   .each(function() {
						$(this).attr('unselectable','on')
						.bind('selectstart',function(){ return false; });
				   });
		});

	};
	
	$.fn.enableSelection =function(){
		return this.each(function() {           
			$(this).attr('unselectable', 'on')
				   .css({'-moz-user-select':'text',
						'-o-user-select':'text',
						'-khtml-user-select':'text',
						'-webkit-user-select':'text',
						'-ms-user-select':'text',
						'user-select':'text'})
				   .each(function() {
						$(this).attr('unselectable','on')
						.unbind('selectstart');
				   });
		});
	}
});

function hideWebkit(){
	setCookie('hidewebkit', 'hidden', 30);
	$('#webkitDiv').animate({opacity:'toggle', height:'toggle'});
}

function autoGenerate(){
	if($('#genAutoYes').is(':checked') && curPreloader){
		clearTimeout(generateTimeout);
		generateTimeout=false;
		generateTimeout=setTimeout('$(".generate_button").click()', 1000);
	}
}

function generatePreloader(download, speed, foreColor, backColor, width, height, transparency, reverse, origColors, grayToTransp, imageType, inverse, flipHor, flipVert, framesAmount, wordTransformed)
{
	framesAmount=parseInt(framesAmount);
	if(!/^[a-fA-F0-9]{6}$/i.test(foreColor)){
		showMessage(words[6], 0);
		return false;
	}
	else if(!/^[a-fA-F0-9]{6}$/i.test(backColor)){
		showMessage(words[7], 0);
		return false;
	}
	
	if(transparency)
		transparency=1;
	else
		transparency=0;

	if(reverse)
		reverse=1;
	else
		reverse=0;

    if(origColors)
        origColors=1;
    else
        origColors=0;

    if(grayToTransp)
        grayToTransp=1;
    else
        grayToTransp=0;

    if(imageType)
        imageType=1;
    else
        imageType=0;
		
	if(inverse)
		inverse=1;
	else
		inverse=0;
	
	if(flipHor && flipVert){
		flip='3';
	}
	else if(flipHor){
		flip='1';
	}
	else if(flipVert){
		flip='2';
	}
	else{
		flip='0';
	}
	
	if($('#constrain').is(':checked')){
		var constrain=1;
	}
	else{
		 var constrain=0;
	}

	var cont=true;
	if(!curPreloader)
	{
		cont=false;
		showMessage(texts[0], 0);
	}
	else if(width>256 || width<5 || height>256 || height<5)
	{
		cont=false;
		showMessage(texts[1], 0);
	}
	else if(framesAmount<2 || framesAmount>curFramesAmount){
		
		cont=false;
		showMessage(words[3],0);
	}
	else if(inverse==1 && grayToTransp==1 && backColor=='FFFFFF' && transparency==0){
		cont=false;
		showMessage(words[4], 0);
	}
	
	if($('#genAutoYes').is(':checked')){
		genAuto=1;
	}
	else{
		genAuto=2;
	}

	if(cont)
	{
		/*if(transparency)
		t=1;
		else
		t=0;*/
		t=transparency;


		if(download)
		{
			$('#generatorFrame').attr('src', '/generator.php?image='+curPreloader+'&speed='+speed+'&fore_color='+foreColor+'&back_color='+backColor+'&size='+width+'x'+height+'&transparency='+t+'&reverse='+reverse+'&orig_colors='+origColors+'&gray_transp='+grayToTransp+'&image_type='+imageType+'&inverse='+inverse+'&flip='+flip+'&frames_amount='+framesAmount+'&word='+wordTransformed+($('#downloadSprites').is(':checked')?'&filmstrip'+($('#animateJS').is(':checked')?'&include_js':'')+($('#animateCanvas').is(':checked')?'&include_canvas':''):'')+'&download&uncacher='+(Math.random()*100));
		}
		else
		{
			var storeUrl=(curStore ?'<div style="margin-top:'+(parseInt(124)+parseInt($('#height').val()))+'px"><a href="'+curStore+'?referral=preloaders" target="_blank" class="whitebox">'+words[9]+'</a></div>':'');
			
			$('.generator .generator_content').html(storeUrl);
            $('.generator .loading').fadeIn();
			
			setCookie('formSettings', speed+'[-]'+foreColor+'[-]'+backColor+'[-]'+transparency+'[-]'+reverse+'[-]'+origColors+'[-]'+grayToTransp+'[-]'+imageType+'[-]'+inverse+'[-]'+flip+'[-]'+constrain+'[-]'+genAuto+'[-]'+$('.generator_content').css('background-color')+'[-]'+$('.generator_content').css('background-image'), 30);
			if(location.href.indexOf('admin')!=-1){
				alert('/generator.php?'+(isCanvasSupported()?'filmstrip&':'')+'image='+curPreloader+'&speed='+speed+'&fore_color='+foreColor+'&back_color='+backColor+'&size='+width+'x'+height+'&transparency='+t+'&reverse='+reverse+'&orig_colors='+origColors+'&gray_transp='+grayToTransp+'&image_type='+imageType+'&inverse='+inverse+'&flip='+flip+'&frames_amount='+framesAmount+'&word='+wordTransformed+'&uncacher='+(Math.random()*100));
			}
			imageLoader('/generator.php?'+(isCanvasSupported()?'filmstrip&':'')+'image='+curPreloader+'&speed='+speed+'&fore_color='+foreColor+'&back_color='+backColor+'&size='+width+'x'+height+'&transparency='+t+'&reverse='+reverse+'&orig_colors='+origColors+'&gray_transp='+grayToTransp+'&image_type='+imageType+'&inverse='+inverse+'&flip='+flip+'&frames_amount='+framesAmount+'&word='+wordTransformed+'&uncacher='+(Math.random()*100), 'showImage(\''+speed+'\', \''+foreColor+'\', \''+backColor+'\', \''+width+'\', \''+height+'\', '+transparency+', '+reverse+', '+origColors+', '+grayToTransp+', '+imageType+', '+inverse+', '+flipHor+', '+flipVert+', '+framesAmount+', \''+wordTransformed+'\')');
		}
	}
}

function isCanvasSupported(){
  var elem = document.createElement('canvas');
  return !!(elem.getContext && elem.getContext('2d'));
}

function imageLoader(s, fun)
{
	clearTimeout(imageTimeout);
	imageTimeout=0;
	genImage = new Image();
	$(genImage).load(function(){
		imageTimeout=setTimeout(fun, 0)
	}).error(function(){
		if(location.href.indexOf('admin')!='-1'){
			imageTimeout=setTimeout(fun, 0)
		}
		else{
			showMessage(words[5], 0);
			$('.generator .loading').fadeOut();
		}
	}).attr('src', s);
}

function showImage(speed, foreColor, backColor, width, height, transparency, reverse, origColors, grayToTransp, imageType, inverse, flipHor, flipVert, framesAmount)
{
	var curDiv=$('.generator .generator_content');
	var apngTest='';
	curDiv.html('');
	
	var downloadButton='<div style="margin-top:150px; "><center><a href="#" class="download_button" title="Download" onclick="generatePreloader(true, \''+speed+'\', \''+foreColor+'\', \''+backColor+'\', \''+width+'\', \''+height+'\', '+transparency+', '+reverse+', '+origColors+', '+grayToTransp+', '+imageType+', '+inverse+', '+flipHor+', '+flipVert+', '+framesAmount+', \''+$('#wordTransformed').val()+'\'); return false;"></a><br /><table border="0" class="whitebox"><tr><td><div class="empty_href">'+words[0]+':&nbsp;&nbsp;&nbsp;</td><td><div id="fileSizeDiv" class="empty_href">'+words[1]+'</div></td></tr></table><br /><br />'+(curStore ?'<a href="'+curStore+'?referral=preloaders" target="_blank" class="whitebox">'+words[9]+'</a>':'')+'</div></center></div>';
	
	if(imageType==0 && !$.browser.mozilla && !$.browser.opera){
		apngTest='<center><img src="/images/apng_note.png" /></center><br /><br />';
	}
	
	if(isCanvasSupported()){//check if browser supports canvas
		curDiv.html(apngTest+'<canvas id="canvas" width="'+$('#width').val()+'" height="'+$('#height').val()+'"><p>Your browser does not support the canvas element.</p></canvas>'+downloadButton);
		
		FPS = Math.round(100/(maxSpeed+2-speed));
		SECONDS_BETWEEN_FRAMES = 1 / FPS;
		g_GameObjectManager = null;
		g_run=genImage;
		
		totalFrames=$('#framesAmount').val();
		frameWidth=$('#width').val();

		g_run.width=totalFrames*frameWidth;
		//genImage.onload=function (){imageTimeout=setTimeout(fun, 0)};
		initCanvas();
	}
	else{
		curDiv.append(genImage);
	
		curDiv.html(apngTest+curDiv.html()+downloadButton);
	}
	
	
	
	$('#downloadOptions').css('top', ($('.download_button').offset().top-280)+'px')
	$('#downloadOptions').show();
	
    $.get('/file_size.php?image='+curPreloader+'&speed='+speed+'&fore_color='+foreColor+'&back_color='+backColor+'&size='+width+'x'+height+'&transparency='+transparency+'&orig_colors='+origColors+'&gray_transp='+grayToTransp+'&image_type='+imageType+'&inverse='+inverse+'&flip='+flip+'&frames_amount='+framesAmount, function(data) {
        if(data==0 || data=='' || data.length>100){
            $('#fileSizeDiv').html(words[2]);
        }
        else{
			var s=data.replace(/\s/gi, '');
            $('#fileSizeDiv').html('~'+Math.round((s/1024))+' KB ( '+data+' B )');
        }
    });

    $('.generator .loading').fadeOut();

}


function showMessage(message, type){
    $('.generator .generator_content').html('<div class="message '+(!type?'err':'confirm')+'">'+message+'</div>');
}


function setCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function deleteCookie(name) {
    setCookie(name,"",-1);
}