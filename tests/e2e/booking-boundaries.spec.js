const {test,expect}=require('@playwright/test');
const fs=require('fs'),path=require('path'),os=require('os');
const {execFileSync}=require('child_process');
const root=path.join(__dirname,'../..');
// Token-based extraction avoids braces inside strings/comments in PHP functions.
function phpFunction(name){
  const code=`$s=file_get_contents($argv[1]);$tokens=token_get_all($s);$out='';$found=false;$capt=false;$depth=0;foreach($tokens as $i=>$t){if(is_array($t)&&$t[0]===T_FUNCTION){$next=$i+1;while(isset($tokens[$next])&&is_array($tokens[$next])&&$tokens[$next][0]===T_WHITESPACE)$next++;$found=isset($tokens[$next])&&is_array($tokens[$next])&&$tokens[$next][1]===$argv[2];}if($found){$out.=is_array($t)?$t[1]:$t;if($t==='{'){$capt=true;$depth++;}if($t==='}'){$depth--;if($capt&&$depth===0){echo $out;exit;}}}}exit(1);`;
  return execFileSync('php',['-r',code,path.join(root,'functions.php'),name],{encoding:'utf8'});
}
function run(){
  const script=`<?php
define('ABSPATH','test');define('ARRAY_A','ARRAY_A');
function add_action($name,$callback){}function wp_json_encode($value){return json_encode($value);}
class WP_Error {public $code;public $message;function __construct($c,$m){$this->code=$c;$this->message=$m;}function get_error_code(){return $this->code;}function get_error_message(){return $this->message;}}
class WP_REST_Response {public $data;public $status;function __construct($d,$s=200){$this->data=$d;$this->status=$s;}function get_status(){return $this->status;}function get_data(){return $this->data;}}
class WP_REST_Request {public $data;function __construct($d){$this->data=$d;}function get_json_params(){return $this->data;}function get_param($k){return $this->data[$k]??null;}function add_header($k,$v){}function set_body($b){$this->data=json_decode($b,true);}}
function wp_strip_all_tags($s){return strip_tags($s);}
function absint($x){return abs((int)$x);}function sanitize_key($x){return $x;}function sanitize_text_field($x){return trim(strip_tags((string)$x));}function sanitize_textarea_field($x){return sanitize_text_field($x);}function is_wp_error($x){return $x instanceof WP_Error;}
$opts=[];function get_option($k,$d=false){global $opts;return $opts[$k]??$d;}function add_option($k,$v,$u='',$a=false){global $opts;if(isset($opts[$k]))return false;$opts[$k]=$v;return true;}function update_option($k,$v,$a=false){global $opts;$opts[$k]=$v;return true;}
class DB {public $prefix='wp_';public $listing;public $offer;public $query='';function prepare($s,...$v){foreach($v as $x)$s=preg_replace('/%[ds]/',is_numeric($x)?$x:"'".$x."'",$s,1);return $s;}function get_row($q,$format=null){return $this->listing;}function update($t,$data,$where){$this->listing=array_merge($this->listing,$data);return 1;}function get_results($q){$this->query=$q;return $this->offer?[$this->offer]:[];}}
$wpdb=new DB();$wpdb->listing=(object)['id'=>42,'user_id'=>2,'status'=>'active','title'=>'DJ'];$wpdb->offer=(object)['id'=>17,'offer_amount'=>100,'conversation_id'=>9];
require ${JSON.stringify(path.join(root,'includes/booking.php'))};
require ${JSON.stringify(path.join(root,'includes/chat/kontaktschutz.php'))};
require ${JSON.stringify(path.join(root,'includes/payments/erstattung-rechte.php'))};
require ${JSON.stringify(path.join(root,'includes/payments/storno.php'))};
require ${JSON.stringify(path.join(root,'includes/payments/storno-routen.php'))};
${phpFunction('eb_stripe_refund')}
$uid=1;$dest='';$calls=[];$payment=['id'=>'pi_test','status'=>'succeeded','amount_received'=>10000,'transfer_data'=>['destination'=>'acct_provider'],'application_fee_amount'=>300];
function get_current_user_id(){global $uid;return $uid;}function eb_is_admin_user($u){return $u===99;}function get_user_meta($u,$k,$s=true){global $dest;return $dest;}
function eb_stripe_api($method,$p,$body=[],$key=''){global $payment,$calls;if($method==='GET')return ['ok'=>true,'data'=>$payment];$calls[]=['body'=>$body,'key'=>$key];return ['ok'=>true,'data'=>['id'=>'re_test','payment_intent'=>'pi_test','status'=>'pending','amount'=>10000]];}
$out=[];$out['money']=array_map('eb_booking_money_cents',[-100,0,'no',0.49,0.50,49.95,1.005,999999.99,1000000]);
$out['valid']=eb_booking_payment_terms(1,['listing_id'=>42,'amount'=>100,'offer_id'=>17]);$out['query']=$wpdb->query;
$out['wrong_amount']=eb_booking_payment_terms(1,['listing_id'=>42,'amount'=>99])->code;
$out['own']=eb_booking_payment_terms(2,['listing_id'=>42,'amount'=>100])->code;
$wpdb->offer=null;$out['no_agreement']=eb_booking_payment_terms(1,['listing_id'=>42,'amount'=>1000])->code;
$out['unknown_type']=eb_booking_validate_message((object)['id'=>9,'listing_id'=>42],1,'mail me','system')->code;
$out['contact']=array_map('eb_message_contains_off_platform_contact',['mail@example.com','Ruf mich auf WhatsApp an','Meine Nummer: +49 171 1234567','Termin 12.06.2027, Budget 1500 Euro','Fotos von Facebook als Inspiration']);
$req=new WP_REST_Request(['payment_intent'=>'pi_test','cancellation_reason'=>'Leider ist der Anbieter erkrankt.']);
$out['buyer_refund']=eb_stripe_refund($req)->status;$uid=2;$dest='acct_wrong';$out['other_provider_refund']=eb_stripe_refund($req)->status;
$dest='acct_provider';$out['missing_reason']=eb_stripe_refund(new WP_REST_Request(['payment_intent'=>'pi_test']))->status;
$out['provider_refund']=eb_stripe_refund($req);$out['refund_call']=$calls[0];$out['refund_state']=get_option('eb_booking_refund_pi_test');
eb_booking_record_refund(['id'=>'re_test','payment_intent'=>'pi_test','status'=>'succeeded','amount'=>10000]);
eb_booking_record_refund(['id'=>'re_test','payment_intent'=>'pi_test','status'=>'pending','amount'=>10000]);
$out['refund_final']=get_option('eb_booking_refund_pi_test');
$wpdb->listing=['id'=>1,'payment_intent'=>'pi_test','status'=>'offen','grund'=>'Der Termin wurde leider abgesagt.','betrag_cents'=>10000,'waehrung'=>'EUR','frist'=>gmdate('Y-m-d H:i:s',time()+86400)];
$uid=2;$dest='acct_provider';$out['storno_pi']=eb_storno_pi_holen('pi_test');
$out['storno_decision']=eb_storno_entscheiden(new WP_REST_Request(['id'=>1,'entscheidung'=>'annehmen']));
echo json_encode($out);`;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eb-booking-'));
  const tmp=path.join(dir,'booking.php');
  try{fs.writeFileSync(tmp,script,{flag:'wx',mode:0o600});return JSON.parse(execFileSync('php',[tmp],{encoding:'utf8'}));}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
let result;test.beforeAll(()=>{result=run();});
test('Money rejects negatives, fractions of cents and invalid amounts',()=>{expect(result.money).toEqual([0,0,0,0,50,4995,0,99999999,0]);});
test('Only exact listing-specific agreed price may be paid',()=>{expect(result.valid.amount).toBe(10000);expect(result.query).toContain('c.listing_id = 42');expect(result.query).toContain('m.id = 17');expect(result.wrong_amount).toBe('agreement_amount_changed');expect(result.own).toBe('own_listing');expect(result.no_agreement).toBe('agreement_required');});
test('System spoofing and contact bypass are rejected without blocking normal dates',()=>{expect(result.unknown_type).toBe('message_type_invalid');expect(result.contact).toEqual([true,true,true,false,false]);});
test('Refund requires actual provider or admin and documented reason',()=>{expect(result.buyer_refund).toBe(403);expect(result.other_provider_refund).toBe(403);expect(result.missing_reason).toBe(400);expect(result.provider_refund.status).toBe(200);});
test('Refund reverses transfer and platform fee and stays pending until confirmed',()=>{expect(result.refund_call.body).toMatchObject({amount:10000,reverse_transfer:'true',refund_application_fee:'true'});expect(result.refund_call.key).toBe('booking_full_refund_pi_test');expect(result.refund_state.re_test.status).toBe('pending');expect(result.provider_refund.data.status).toBe('pending');expect(result.refund_final.re_test.status).toBe('succeeded');});

test('Cancellation decision reaches the actual refund route with its required reason',()=>{expect(result.storno_pi.id).toBe('pi_test');expect(result.storno_decision.status).toBe(200);expect(result.storno_decision.data.storno.zustand).toBe('angenommen');});
