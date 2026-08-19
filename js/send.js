    //alert("funcion de boton enviar");
    function sendMail(objeto) {
      //alert("entro a la función sendmail");
      var funcion ="mailto:";
      //alert("El id del objeto seleccionado es: "+objeto.id);
      var correo = objeto.id;
      var separador = "@";
      var dominio = "squarenet";
      var extension = ".com.ec";
      var extra = "?subject="+objeto.id+"%20SquareNet";
      var link = funcion+correo+separador+dominio+extension+extra;
      //alert("se envia: "+link);
      window.location.href = link;
    } 

