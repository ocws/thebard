$(window).on('hashchange', function() {
    if($('.text-chunk').length > 0){
        gotoLine(window.location.hash.substring(1));
    }
});
function downloadPDF(){
    Materialize.toast('Rendering...', 4000);
    var chunks = $(".verse-line");
    console.log(chunks);
    var text = [];
    for(var i = 0; i < chunks.length; i++){
        text.push($(chunks[i]).html().replace(/<br>/g, "\n"));
    }
    console.log(text);
    var docDefinition = { content: text };
    pdfMake.createPdf(docDefinition).download();
}
function gotoLine(number){
    var text = $('.text-chunk');
    var currentLine = 0;
    for(var i = 0; i < text.length; i++){
        var line = $(text[i]).find('.verse-line, .prose-line');
        if(line.length > 0){
            var lines = $(line[0]).find('span');
            console.log(lines);
            if(lines.length > 0){
                for(var j = 0; j < lines.length; j++){
                    currentLine++;
                    if(currentLine >= number){
                        $('html, body').animate({
                            scrollTop: $(lines[j]).offset().top
                        }, 1000);
                        return;
                    }
                }
            }
        }
    }
    Materialize.toast('Line doesn\'t exist.', 4000);
}
