#include <stdio.h>
#include <jpeglib.h>
#include <string.h>
int main(void) {
 struct jpeg_decompress_struct in; struct jpeg_compress_struct out;
 struct jpeg_error_mgr ie,oe;
 in.err=jpeg_std_error(&ie);out.err=jpeg_std_error(&oe);
 jpeg_create_decompress(&in);jpeg_create_compress(&out);
 jpeg_stdio_src(&in,stdin);jpeg_stdio_dest(&out,stdout);
 for(int i=0;i<16;i++)jpeg_save_markers(&in,JPEG_APP0+i,0xffff);
 jpeg_save_markers(&in,JPEG_COM,0xffff);
 jpeg_read_header(&in,TRUE);
 jvirt_barray_ptr *coeff=jpeg_read_coefficients(&in);
 jpeg_copy_critical_parameters(&in,&out);
 out.optimize_coding=TRUE;jpeg_simple_progression(&out);
 jpeg_write_coefficients(&out,coeff);
 for(jpeg_saved_marker_ptr m=in.marker_list;m;m=m->next){
  if(out.write_JFIF_header&&m->marker==JPEG_APP0&&m->data_length>=5&&!memcmp(m->data,"JFIF\0",5))continue;
  if(out.write_Adobe_marker&&m->marker==JPEG_APP0+14&&m->data_length>=5&&!memcmp(m->data,"Adobe",5))continue;
  jpeg_write_marker(&out,m->marker,m->data,m->data_length);
 }
 jpeg_finish_compress(&out);jpeg_finish_decompress(&in);
 jpeg_destroy_compress(&out);jpeg_destroy_decompress(&in);return 0;
}
